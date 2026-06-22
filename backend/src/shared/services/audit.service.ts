import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { AuditAction } from '../enums';
import * as crypto from 'crypto';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Računa hash zapisa SAMO iz polja koja se trajno čuvaju u bazi.
   * Time se isti hash može kasnije preračunati pri verifikaciji.
   */
  private computeHash(fields: {
    action: string;
    userId: string | null;
    secretId: string | null;
    metadata: string | null;
    previousHash: string | null;
    createdAt: Date;
  }): string {
    const hashInput = JSON.stringify({
      action: fields.action,
      userId: fields.userId,
      secretId: fields.secretId,
      metadata: fields.metadata,
      previousHash: fields.previousHash,
      createdAt: new Date(fields.createdAt).toISOString(),
    });
    return crypto.createHash('sha256').update(hashInput).digest('hex');
  }

  async log(data: {
    action: AuditAction;
    userId?: string;
    secretId?: string;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditLog> {
    const logs = await this.auditLogRepository.find({
      order: { createdAt: 'DESC' },
      take: 1,
    });

    const lastLog = logs.length > 0 ? logs[0] : null;
    const previousHash = lastLog?.currentHash || null;

    const metadata = data.metadata ? JSON.stringify(data.metadata) : null;

    // 1. Prvo snimimo zapis da baza generiše createdAt.
    const auditLog = this.auditLogRepository.create({
      action: data.action,
      userId: data.userId || null,
      secretId: data.secretId || null,
      metadata,
      previousHash,
      currentHash: '', // privremeno
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
    });
    const saved = await this.auditLogRepository.save(auditLog);

    // 2. Izračunamo hash nad STVARNIM createdAt iz baze i upišemo ga.
    saved.currentHash = this.computeHash({
      action: saved.action,
      userId: saved.userId,
      secretId: saved.secretId,
      metadata: saved.metadata,
      previousHash: saved.previousHash,
      createdAt: saved.createdAt,
    });

    return await this.auditLogRepository.save(saved);
  }

  /**
   * Provjera integriteta u DVA koraka:
   *  (a) preračuna hash svakog zapisa iz njegovog sadržaja i uporedi sa sačuvanim
   *      -> hvata IZMJENU sadržaja postojećeg zapisa.
   *  (b) provjeri da previousHash svakog zapisa odgovara currentHash prethodnog
   *      -> hvata BRISANJE ili UMETANJE zapisa.
   */
  async verifyIntegrity(): Promise<{
    isValid: boolean;
    brokenAt?: string;
  }> {
    const logs = await this.auditLogRepository.find({
      order: { createdAt: 'ASC' },
    });

    let previousHash: string | null = null;

    for (const log of logs) {
      // (a) sadržaj zapisa mora da odgovara svom hash-u
      const recomputed = this.computeHash({
        action: log.action,
        userId: log.userId,
        secretId: log.secretId,
        metadata: log.metadata,
        previousHash: log.previousHash,
        createdAt: log.createdAt,
      });

      if (recomputed !== log.currentHash) {
        return { isValid: false, brokenAt: log.id };
      }

      // (b) veza sa prethodnim zapisom mora da bude očuvana
      if (log.previousHash !== previousHash) {
        return { isValid: false, brokenAt: log.id };
      }

      previousHash = log.currentHash;
    }

    return { isValid: true };
  }

  async getRecentLogs(limit: number = 50): Promise<AuditLog[]> {
    return await this.auditLogRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['user', 'secret'],
    });
  }

  async getLogsByUser(userId: string, limit: number = 50): Promise<AuditLog[]> {
    return await this.auditLogRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['secret'],
    });
  }
}
