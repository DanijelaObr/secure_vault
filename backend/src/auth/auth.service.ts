import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../database/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { MfaService } from './mfa.service';
import { CryptoService } from '../shared/services/crypto.service';
import { AuditService } from '../shared/services/audit.service';
import { AuditAction } from '../shared/enums';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private mfaService: MfaService,
    private cryptoService: CryptoService,
    private auditService: AuditService,
  ) {}

  async register(
    registerDto: RegisterDto,
  ): Promise<{ message: string; userId: string }> {
    const { email, username, password, role } = registerDto;

    // Provjeri da li korisnik već postoji
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash lozinke
    const passwordHash = await bcrypt.hash(password, 10);

    // Generiši RSA key pair
    const { publicKey, privateKey } = this.cryptoService.generateKeyPair();

    // Enkriptuj private key sa master password-om korisnika
    const encryptedPrivateKey = this.cryptoService.encryptPrivateKey(
      privateKey,
      password, // Master password
    );

    // Kreiraj korisnika
    const user = this.userRepository.create({
      email,
      username,
      passwordHash,
      role,
      publicKey,
      encryptedPrivateKey,
      mfaEnabled: false,
    });

    const savedUser = await this.userRepository.save(user);

    await this.auditService.log({
      action: AuditAction.USER_REGISTER,
      userId: savedUser.id,
      metadata: { email: savedUser.email, role: savedUser.role },
    });

    return {
      message: 'User registered successfully',
      userId: savedUser.id,
    };
  }

  async login(
    loginDto: LoginDto,
  ): Promise<{ access_token: string; user: any; requiresMfa?: boolean }> {
    const { email, password, mfaCode } = loginDto;

    // Pronađi korisnika
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Provjeri frozen status
    if (user.isFrozen) {
      throw new UnauthorizedException(
        'Account is frozen. Contact administrator.',
      );
    }

    // Provjeri lozinku
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // ===== MFA PROVJERA =====
    if (user.mfaEnabled) {
      // Ako MFA je enabled, MORA poslati mfaCode
      if (!mfaCode) {
        return {
          access_token: '',
          user: { id: user.id, email: user.email },
          requiresMfa: true, // Signal frontend-u da traži MFA kod
        };
      }

      // Validiraj MFA kod
      const isValidMfa = this.mfaService.verifyToken(mfaCode, user.mfaSecret!);
      if (!isValidMfa) {
        throw new UnauthorizedException('Invalid MFA code');
      }
    }

    // Update last login
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    // Generiši JWT token
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const access_token = this.jwtService.sign(payload);

    // AUDIT LOG
    await this.auditService.log({
      action: AuditAction.USER_LOGIN,
      userId: user.id,
      metadata: { email: user.email },
    });

    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    };
  }

  /**
   * Aktiviraj MFA za korisnika
   */
  async enableMfa(userId: string): Promise<{ qrCode: string; secret: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Generiši MFA secret
    const secret = this.mfaService.generateSecret();

    // Generiši QR kod URL
    const otpAuthUrl = this.mfaService.generateQrCodeUrl(user.email, secret);

    // Generiši QR kod sliku
    const qrCode = await this.mfaService.generateQrCode(otpAuthUrl);

    // Sačuvaj secret (ali još ne aktiviraj MFA - čekamo potvrdu)
    user.mfaSecret = secret;
    await this.userRepository.save(user);

    return { qrCode, secret };
  }

  /**
   * Verifikuj i finalizuj MFA aktivaciju
   */
  async verifyAndEnableMfa(
    userId: string,
    token: string,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || !user.mfaSecret) {
      throw new UnauthorizedException('MFA setup not initiated');
    }

    // Provjeri da li je kod validan
    const isValid = this.mfaService.verifyToken(token, user.mfaSecret);
    if (!isValid) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    // Aktiviraj MFA
    user.mfaEnabled = true;
    await this.userRepository.save(user);

    // AUDIT LOG
    await this.auditService.log({
      action: AuditAction.MFA_ENABLED,
      userId,
    });

    return { message: 'MFA enabled successfully' };
  }

  /**
   * Disable MFA
   */
  async disableMfa(
    userId: string,
    token: string,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || !user.mfaEnabled) {
      throw new UnauthorizedException('MFA is not enabled');
    }

    // Provjeri da li je kod validan prije nego onemogućimo MFA
    const isValid = this.mfaService.verifyToken(token, user.mfaSecret!);
    if (!isValid) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    // Disable MFA
    user.mfaEnabled = false;
    user.mfaSecret = null;
    await this.userRepository.save(user);

    // AUDIT LOG
    await this.auditService.log({
      action: AuditAction.MFA_DISABLED,
      userId,
    });

    return { message: 'MFA disabled successfully' };
  }
}
