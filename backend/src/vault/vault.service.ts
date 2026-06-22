import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Secret } from '../database/entities/secret.entity';
import { CreateSecretDto } from './dto/create-secret.dto';
import { UpdateSecretDto } from './dto/update-secret.dto';
import { User } from '../database/entities/user.entity';
import { SharedSecret } from '../database/entities/shared-secret.entity';
import { ShareSecretDto } from './dto/share-secret.dto';
import { SharedSecretPermission } from 'src/shared/enums';
import { AuditService } from '../shared/services/audit.service';
import { AuditAction } from '../shared/enums';
import { EmailService } from 'src/shared/services/email.service';

@Injectable()
export class VaultService {
  constructor(
    @InjectRepository(Secret)
    private secretRepository: Repository<Secret>,
    @InjectRepository(SharedSecret)
    private sharedSecretRepository: Repository<SharedSecret>,
    private auditService: AuditService,
    private emailService: EmailService,
  ) {}

  async createSecret(
    userId: string,
    createSecretDto: CreateSecretDto,
  ): Promise<Secret> {
    // encryptedData i encryptedKey su VEĆ enkriptovani na klijentu.
    const secret = this.secretRepository.create({
      ...createSecretDto,
      ownerId: userId,
    });

    const savedSecret = await this.secretRepository.save(secret);

    await this.auditService.log({
      action: AuditAction.SECRET_CREATE,
      userId,
      secretId: savedSecret.id,
      metadata: { title: savedSecret.title, type: savedSecret.type },
    });

    return savedSecret;
  }

  async getAllSecrets(userId: string): Promise<Secret[]> {
    return this.secretRepository.find({
      // Honeypot tajne se NE prikazuju kroz interfejs nijednom korisniku.
      // Ostaju u bazi kao zamka — vidljive samo onome ko im pristupi "ispod haube".
      where: { ownerId: userId, isHoneypot: false },
      order: { updatedAt: 'DESC' },
    });
  }

  async getSecretById(
    userId: string,
    secretId: string,
    userEmail: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Secret> {
    const secret = await this.secretRepository.findOne({
      where: { id: secretId },
      relations: ['owner'],
    });

    if (!secret) {
      throw new NotFoundException('Secret not found');
    }

    // HONEYPOT DETEKCIJA
    if (secret.isHoneypot) {
      await this.auditService.log({
        action: AuditAction.HONEYPOT_TRIGGERED,
        userId,
        secretId,
        metadata: { secretTitle: secret.title },
      });

      await this.freezeUserAccount(userId);

      await this.emailService.sendHoneypotAlert(
        userEmail,
        secret.title,
        ipAddress || 'unknown',
        userAgent || 'unknown',
      );

      throw new ForbiddenException(
        'This account has been frozen due to suspicious activity. Contact administrator.',
      );
    }

    if (secret.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this secret');
    }

    secret.lastAccessedAt = new Date();
    await this.secretRepository.save(secret);

    return secret;
  }

  async updateSecret(
    userId: string,
    secretId: string,
    updateSecretDto: UpdateSecretDto,
    userEmail: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Secret> {
    const secret = await this.getSecretById(
      userId,
      secretId,
      userEmail,
      ipAddress,
      userAgent,
    );

    Object.assign(secret, updateSecretDto);
    const updatedSecret = await this.secretRepository.save(secret);

    await this.auditService.log({
      action: AuditAction.SECRET_UPDATE,
      userId,
      secretId,
      metadata: { title: updatedSecret.title },
    });

    return updatedSecret;
  }

  private async freezeUserAccount(userId: string): Promise<void> {
    const userRepository = this.secretRepository.manager.getRepository(User);
    const user = await userRepository.findOne({ where: { id: userId } });
    if (user) {
      user.isFrozen = true;
      await userRepository.save(user);
    }
  }

  async deleteSecret(
    userId: string,
    secretId: string,
    userEmail: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    const secret = await this.getSecretById(
      userId,
      secretId,
      userEmail,
      ipAddress,
      userAgent,
    );

    await this.auditService.log({
      action: AuditAction.SECRET_DELETE,
      userId,
      secretId,
      metadata: { title: secret.title },
    });

    await this.secretRepository.remove(secret);
    return { message: 'Secret deleted successfully' };
  }

  async getFavoriteSecrets(userId: string): Promise<Secret[]> {
    return this.secretRepository.find({
      where: { ownerId: userId, isFavorite: true, isHoneypot: false },
      order: { updatedAt: 'DESC' },
    });
  }

  async createHoneypot(
    userId: string,
    createSecretDto: CreateSecretDto,
  ): Promise<Secret> {
    const secret = this.secretRepository.create({
      ...createSecretDto,
      ownerId: userId,
      isHoneypot: true,
    });
    return this.secretRepository.save(secret);
  }

  /**
   * Dijeljenje tajne. Klijent je VEĆ re-enkriptovao AES ključ javnim ključem
   * primaoca i poslao ga kao shareDto.encryptedKey. Server samo skladišti.
   */
  async shareSecret(
    ownerId: string,
    secretId: string,
    shareDto: ShareSecretDto,
    ownerEmail: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    const secret = await this.getSecretById(
      ownerId,
      secretId,
      ownerEmail,
      ipAddress,
      userAgent,
    );

    const userRepository = this.secretRepository.manager.getRepository(User);
    const targetUser = await userRepository.findOne({
      where: { email: shareDto.sharedWithEmail },
    });

    if (!targetUser) {
      throw new NotFoundException(
        `User with email ${shareDto.sharedWithEmail} not found`,
      );
    }
    if (targetUser.id === ownerId) {
      throw new ForbiddenException('Cannot share secret with yourself');
    }

    const existingShare = await this.sharedSecretRepository.findOne({
      where: { secretId, sharedWithUserId: targetUser.id },
    });
    if (existingShare) {
      throw new ForbiddenException('Secret already shared with this user');
    }

    // encryptedKey je re-enkriptovan NA KLIJENTU javnim ključem primaoca.
    const sharedSecret = this.sharedSecretRepository.create({
      secretId,
      sharedWithUserId: targetUser.id,
      encryptedKey: shareDto.encryptedKey,
      permission: shareDto.permission || SharedSecretPermission.READ,
    });
    await this.sharedSecretRepository.save(sharedSecret);

    await this.auditService.log({
      action: AuditAction.SECRET_SHARE,
      userId: ownerId,
      secretId,
      metadata: {
        sharedWith: targetUser.email,
        permission: shareDto.permission || 'read',
      },
    });

    // void da referenca na 'secret' ne baca lint warning
    void secret;

    return { message: `Secret shared with ${targetUser.email}` };
  }

  /**
   * Tajne podijeljene SA MNOM. Vraćamo encryptedData (sadržaj) i MOJ encryptedKey
   * (AES ključ enkriptovan mojim javnim ključem). Dešifrovanje ide na klijentu.
   */
  async getSharedWithMe(userId: string): Promise<any[]> {
    const sharedSecrets = await this.sharedSecretRepository.find({
      where: { sharedWithUserId: userId },
      relations: ['secret', 'secret.owner'],
    });

    return sharedSecrets.map((shared) => ({
      id: shared.secret.id,
      title: shared.secret.title,
      type: shared.secret.type,
      url: shared.secret.url,
      username: shared.secret.username,
      encryptedData: shared.secret.encryptedData,
      encryptedKey: shared.encryptedKey, // ključ za MENE
      owner: {
        email: shared.secret.owner.email,
        username: shared.secret.owner.username,
      },
      permission: shared.permission,
      sharedAt: shared.sharedAt,
    }));
  }

  async revokeShare(
    ownerId: string,
    secretId: string,
    sharedWithEmail: string,
    ownerEmail: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    await this.getSecretById(
      ownerId,
      secretId,
      ownerEmail,
      ipAddress,
      userAgent,
    );

    const userRepository = this.secretRepository.manager.getRepository(User);
    const targetUser = await userRepository.findOne({
      where: { email: sharedWithEmail },
    });
    if (!targetUser) {
      throw new NotFoundException(
        `User with email ${sharedWithEmail} not found`,
      );
    }

    const sharedSecret = await this.sharedSecretRepository.findOne({
      where: { secretId, sharedWithUserId: targetUser.id },
    });
    if (!sharedSecret) {
      throw new NotFoundException('Shared secret not found');
    }

    await this.sharedSecretRepository.remove(sharedSecret);

    await this.auditService.log({
      action: AuditAction.SECRET_REVOKE_SHARE,
      userId: ownerId,
      secretId,
      metadata: { revokedFrom: targetUser.email },
    });

    return { message: `Sharing revoked for ${targetUser.email}` };
  }

  /**
   * SQL Injection TEST endpoint — NAMJERNO RANJIV. Radi samo ako je
   * sqlInjectionTestEnabled = true u security policy (admin ga privremeno pali/gasi).
   * Provjeru flega radi kontroler prije poziva.
   */
  async testSqlInjection(email: string): Promise<any> {
    const query = `SELECT * FROM users WHERE email = '${email}'`;
    try {
      const result = await this.secretRepository.query(query);
      return { message: 'SQL Injection test executed', query, results: result };
    } catch (error: any) {
      return {
        message: 'SQL Injection test failed',
        query,
        error: error.message,
      };
    }
  }
}
