import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../database/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { MfaService } from './mfa.service';
import { AuditService } from '../shared/services/audit.service';
import { AuditAction } from '../shared/enums';
import { UserRole } from '../shared/enums';
import { RefreshToken } from '../database/entities/refresh-token.entity';
import * as crypto from 'crypto';
import { AdminService } from '../admin/admin.service';
import { SecurityService } from '../shared/services/security.service';
import { ActivityType } from '../database/entities/suspicious-activity.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private jwtService: JwtService,
    private mfaService: MfaService,
    private auditService: AuditService,
    private adminService: AdminService,
    private securityService: SecurityService,
  ) {}

  async register(
    registerDto: RegisterDto,
  ): Promise<{ message: string; userId: string }> {
    const {
      email,
      username,
      password,
      role,
      publicKey,
      encryptedPrivateKey,
      salt,
    } = registerDto;

    const existingUser = await this.userRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Validacija master passworda prema security policy
    const passwordValidation =
      await this.adminService.validatePassword(password);
    if (!passwordValidation.valid) {
      throw new ConflictException(
        `Password does not meet security requirements: ${passwordValidation.errors.join(', ')}`,
      );
    }

    // Hash lozinke (samo za autentikaciju — NE za kripto)
    const passwordHash = await bcrypt.hash(password, 10);

    // ZERO-KNOWLEDGE: ključeve je već generisao KLIJENT.
    // Server samo skladišti publicKey + (već enkriptovan) encryptedPrivateKey + salt.
    const user = this.userRepository.create({
      email,
      username,
      passwordHash,
      role,
      publicKey,
      encryptedPrivateKey,
      salt,
      mfaEnabled: false,
    });

    const savedUser = await this.userRepository.save(user);

    await this.auditService.log({
      action: AuditAction.USER_REGISTER,
      userId: savedUser.id,
      metadata: { email: savedUser.email, role: savedUser.role },
    });

    return { message: 'User registered successfully', userId: savedUser.id };
  }

  async login(
    loginDto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    access_token: string;
    refresh_token: string;
    user: any;
    requiresMfa?: boolean;
  }> {
    const { email, password, mfaCode } = loginDto;

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.isFrozen) {
      throw new UnauthorizedException(
        'Account is frozen. Contact administrator.',
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      await this.securityService.logSuspiciousActivity(
        ipAddress || 'unknown',
        ActivityType.FAILED_LOGIN,
        undefined,
        userAgent,
        `Failed login attempt for email: ${email}`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    // ===== MFA PROVJERA =====
    if (user.mfaEnabled) {
      if (!mfaCode) {
        return {
          access_token: '',
          refresh_token: '',
          user: { id: user.id, email: user.email },
          requiresMfa: true,
        };
      }

      const isValidMfa = this.mfaService.verifyToken(mfaCode, user.mfaSecret!);
      if (!isValidMfa) {
        await this.securityService.logSuspiciousActivity(
          ipAddress || 'unknown',
          ActivityType.FAILED_LOGIN,
          user.id,
          userAgent,
          'Invalid MFA code',
        );
        throw new UnauthorizedException('Invalid MFA code');
      }
    }

    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    const payload = { sub: user.id, email: user.email, role: user.role };

    const policy = await this.adminService.getSecurityPolicy();
    const access_token = this.jwtService.sign(payload, {
      expiresIn: `${policy.accessTokenDuration}m`,
    });

    const refresh_token = await this.generateRefreshToken(
      user.id,
      ipAddress,
      userAgent,
    );

    await this.auditService.log({
      action: AuditAction.USER_LOGIN,
      userId: user.id,
      metadata: { email: user.email },
    });

    // Vraćamo i kripto materijal da klijent može izvesti master ključ
    // i otključati svoj privatni ključ U BROWSERU.
    return {
      access_token,
      refresh_token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        salt: user.salt,
        encryptedPrivateKey: user.encryptedPrivateKey,
        publicKey: user.publicKey,
      },
    };
  }

  /**
   * Vraća kripto materijal trenutnog korisnika (za otključavanje vault-a na klijentu).
   */
  async getCryptoMaterial(userId: string): Promise<{
    salt: string | null;
    encryptedPrivateKey: string;
    publicKey: string;
  }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return {
      salt: user.salt,
      encryptedPrivateKey: user.encryptedPrivateKey,
      publicKey: user.publicKey,
    };
  }

  /**
   * Vraća javni ključ korisnika po emailu (za dijeljenje tajni).
   */
  async getPublicKeyByEmail(
    email: string,
  ): Promise<{ email: string; publicKey: string }> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }
    return { email: user.email, publicKey: user.publicKey };
  }

  async enableMfa(userId: string): Promise<{ qrCode: string; secret: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const secret = this.mfaService.generateSecret();
    const otpAuthUrl = this.mfaService.generateQrCodeUrl(user.email, secret);
    const qrCode = await this.mfaService.generateQrCode(otpAuthUrl);
    user.mfaSecret = secret;
    await this.userRepository.save(user);
    return { qrCode, secret };
  }

  async verifyAndEnableMfa(
    userId: string,
    token: string,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || !user.mfaSecret) {
      throw new UnauthorizedException('MFA setup not initiated');
    }
    const isValid = this.mfaService.verifyToken(token, user.mfaSecret);
    if (!isValid) {
      throw new UnauthorizedException('Invalid MFA code');
    }
    user.mfaEnabled = true;
    await this.userRepository.save(user);
    await this.auditService.log({ action: AuditAction.MFA_ENABLED, userId });
    return { message: 'MFA enabled successfully' };
  }

  async disableMfa(
    userId: string,
    token: string,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || !user.mfaEnabled) {
      throw new UnauthorizedException('MFA is not enabled');
    }
    const isValid = this.mfaService.verifyToken(token, user.mfaSecret!);
    if (!isValid) {
      throw new UnauthorizedException('Invalid MFA code');
    }
    user.mfaEnabled = false;
    user.mfaSecret = null;
    await this.userRepository.save(user);
    await this.auditService.log({ action: AuditAction.MFA_DISABLED, userId });
    return { message: 'MFA disabled successfully' };
  }

  /**
   * Google OIDC login. NAPOMENA: Google korisnik nema master password,
   * pa pri prvom ulasku NEMA kripto ključeve. Vault se otključava tek
   * kada korisnik na klijentu postavi zaseban master password
   * (poziv ka setupVaultKeys ispod). Do tada može da koristi sve OSIM
   * čitanja/kreiranja enkriptovanih tajni.
   */
  async googleLogin(googleUser: any) {
    let user = await this.userRepository.findOne({
      where: { email: googleUser.email },
    });

    if (!user) {
      user = this.userRepository.create({
        email: googleUser.email,
        username: googleUser.email.split('@')[0],
        passwordHash: '',
        role: UserRole.DEVELOPER,
        publicKey: '', // postavlja se kasnije, kada korisnik definiše vault master password
        encryptedPrivateKey: '',
        salt: null,
        mfaEnabled: false,
      });
      user = await this.userRepository.save(user);

      await this.auditService.log({
        action: AuditAction.USER_REGISTER,
        userId: user.id,
        metadata: { email: user.email, provider: 'google' },
      });
    }

    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    const payload = { email: user.email, sub: user.id, role: user.role };
    const access_token = this.jwtService.sign(payload);

    await this.auditService.log({
      action: AuditAction.USER_LOGIN,
      userId: user.id,
      metadata: { email: user.email, provider: 'google' },
    });

    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        salt: user.salt,
        encryptedPrivateKey: user.encryptedPrivateKey,
        publicKey: user.publicKey,
        vaultInitialized: !!user.salt,
      },
    };
  }

  /**
   * Postavlja kripto ključeve za nalog koji ih nema (npr. Google korisnik).
   * Klijent generiše ključeve iz odabranog vault master passworda i šalje ih.
   */
  async setupVaultKeys(
    userId: string,
    publicKey: string,
    encryptedPrivateKey: string,
    salt: string,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.salt) {
      throw new ConflictException('Vault keys already initialized');
    }
    user.publicKey = publicKey;
    user.encryptedPrivateKey = encryptedPrivateKey;
    user.salt = salt;
    await this.userRepository.save(user);
    return { message: 'Vault keys initialized' };
  }

  async generateRefreshToken(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<string> {
    const token = crypto.randomBytes(64).toString('hex');
    const policy = await this.adminService.getSecurityPolicy();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + policy.refreshTokenDuration);

    await this.refreshTokenRepository.save({
      token,
      userId,
      expiresAt,
      ipAddress,
      userAgent,
      revoked: false,
    });
    return token;
  }

  async refreshTokens(
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const tokenRecord = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken, revoked: false },
      relations: ['user'],
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (new Date() > tokenRecord.expiresAt) {
      throw new UnauthorizedException('Refresh token expired');
    }

    tokenRecord.revoked = true;
    await this.refreshTokenRepository.save(tokenRecord);

    const payload = {
      sub: tokenRecord.user.id,
      email: tokenRecord.user.email,
      role: tokenRecord.user.role,
    };
    const policy = await this.adminService.getSecurityPolicy();
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: `${policy.accessTokenDuration}m`,
    });

    const newRefreshToken = await this.generateRefreshToken(
      tokenRecord.user.id,
      ipAddress,
      userAgent,
    );

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshToken: string) {
    if (!refreshToken) {
      return;
    }
    await this.refreshTokenRepository.update(
      { token: refreshToken },
      { revoked: true },
    );
  }
}
