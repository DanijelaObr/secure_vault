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
import { CryptoService } from '../shared/services/crypto.service';
import { SharedSecretPermission } from 'src/shared/enums';
import { AuditService } from '../shared/services/audit.service';
import { AuditAction } from '../shared/enums';

@Injectable()
export class VaultService {
  constructor(
    @InjectRepository(Secret)
    private secretRepository: Repository<Secret>,
    @InjectRepository(SharedSecret)
    private sharedSecretRepository: Repository<SharedSecret>,
    private cryptoService: CryptoService,
    private auditService: AuditService,
  ) {}

  /**
   * Kreiranje nove tajne
   */
  async createSecret(
    userId: string,
    createSecretDto: CreateSecretDto,
  ): Promise<Secret> {
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

  /**
   * Dohvati SVE tajne korisnika
   */
  async getAllSecrets(userId: string): Promise<Secret[]> {
    return await this.secretRepository.find({
      where: { ownerId: userId },
      order: { updatedAt: 'DESC' },
    });
  }

  /**
   * Dohvati JEDNU tajnu (samo ako je vlasnik!)
   */
  async getSecretById(userId: string, secretId: string): Promise<Secret> {
    const secret = await this.secretRepository.findOne({
      where: { id: secretId },
      relations: ['owner'],
    });

    if (!secret) {
      throw new NotFoundException('Secret not found');
    }

    // ===== HONEYPOT DETEKCIJA =====
    if (secret.isHoneypot) {
      // Loguj honeypot pristup
      console.warn(
        `HONEYPOT TRIGGERED! User ${userId} accessed honeypot secret ${secretId}`,
      );

      // AUDIT LOG - Honeypot
      await this.auditService.log({
        action: AuditAction.HONEYPOT_TRIGGERED,
        userId,
        secretId,
        metadata: { secretTitle: secret.title },
      });

      // Freeze korisnikov account ODMAH!
      await this.freezeUserAccount(userId);

      await this.auditService.log({
        action: AuditAction.SECRET_READ,
        userId,
        secretId: secret.id,
      });

      // TODO: Poslati alert admin-u (email, SMS, itd.)

      throw new ForbiddenException(
        'This account has been frozen due to suspicious activity. Contact administrator.',
      );
    }

    // Provjeri da li je korisnik vlasnik
    if (secret.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this secret');
    }

    // Update lastAccessedAt
    secret.lastAccessedAt = new Date();
    await this.secretRepository.save(secret);

    return secret;
  }

  /**
   * Update tajne
   */
  async updateSecret(
    userId: string,
    secretId: string,
    updateSecretDto: UpdateSecretDto,
  ): Promise<Secret> {
    const secret = await this.getSecretById(userId, secretId);

    Object.assign(secret, updateSecretDto);
    const updatedSecret = await this.secretRepository.save(secret);

    // AUDIT LOG
    await this.auditService.log({
      action: AuditAction.SECRET_UPDATE,
      userId,
      secretId,
      metadata: { changes: updateSecretDto },
    });

    return updatedSecret;
  }

  /**
   * Freeze korisnikov account (honeypot triggered)
   */
  private async freezeUserAccount(userId: string): Promise<void> {
    const userRepository = this.secretRepository.manager.getRepository(User);

    const user = await userRepository.findOne({ where: { id: userId } });
    if (user) {
      user.isFrozen = true;
      await userRepository.save(user);
      console.error(`User account ${userId} (${user.email}) has been FROZEN!`);
    }
  }
  /**
   * Brisanje tajne
   */
  async deleteSecret(
    userId: string,
    secretId: string,
  ): Promise<{ message: string }> {
    const secret = await this.getSecretById(userId, secretId);

    await this.secretRepository.remove(secret);

    // AUDIT LOG
    await this.auditService.log({
      action: AuditAction.SECRET_DELETE,
      userId,
      secretId,
      metadata: { title: secret.title },
    });

    return { message: 'Secret deleted successfully' };
  }

  /**
   * Dohvati favorite tajne
   */
  async getFavoriteSecrets(userId: string): Promise<Secret[]> {
    return await this.secretRepository.find({
      where: { ownerId: userId, isFavorite: true },
      order: { updatedAt: 'DESC' },
    });
  }

  /**
   * Kreiranje honeypot tajne (samo za admin-e!)
   */
  async createHoneypot(
    userId: string,
    createSecretDto: CreateSecretDto,
  ): Promise<Secret> {
    const secret = this.secretRepository.create({
      ...createSecretDto,
      ownerId: userId,
      isHoneypot: true, // ← Označi kao honeypot!
    });

    console.log(`Honeypot secret created: "${secret.title}" by user ${userId}`);

    return await this.secretRepository.save(secret);
  }

  /**
   * Podijeli tajnu sa drugim korisnikom
   */
  async shareSecret(
    ownerId: string,
    secretId: string,
    shareDto: ShareSecretDto,
  ): Promise<{ message: string }> {
    const secret = await this.getSecretById(ownerId, secretId);

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

    const encryptedKey = this.cryptoService.encryptWithPublicKey(
      secret.encryptedData,
      targetUser.publicKey,
    );

    const sharedSecret = this.sharedSecretRepository.create({
      secretId,
      sharedWithUserId: targetUser.id,
      encryptedKey,
      permission: shareDto.permission || SharedSecretPermission.READ,
    });

    await this.sharedSecretRepository.save(sharedSecret);

    // AUDIT LOG
    await this.auditService.log({
      action: AuditAction.SECRET_SHARE,
      userId: ownerId,
      secretId,
      metadata: {
        sharedWith: targetUser.email,
        permission: shareDto.permission || 'read',
      },
    });

    return { message: `Secret shared with ${targetUser.email}` };
  }

  /**
   * Dohvati sve tajne podijeljene SA MNOM
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
      notes: shared.secret.notes,
      encryptedData: shared.encryptedKey,
      owner: {
        email: shared.secret.owner.email,
        username: shared.secret.owner.username,
      },
      permission: shared.permission,
      sharedAt: shared.sharedAt,
    }));
  }

  /**
   * Revoke sharing
   */
  async revokeShare(
    ownerId: string,
    secretId: string,
    sharedWithEmail: string,
  ): Promise<{ message: string }> {
    await this.getSecretById(ownerId, secretId);

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

    // AUDIT LOG
    await this.auditService.log({
      action: AuditAction.SECRET_REVOKE_SHARE,
      userId: ownerId,
      secretId,
      metadata: { revokedFrom: targetUser.email },
    });

    return { message: `Sharing revoked for ${targetUser.email}` };
  }
}
