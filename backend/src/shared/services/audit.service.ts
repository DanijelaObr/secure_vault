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

    const hashInput = JSON.stringify({
      action: data.action,
      userId: data.userId,
      secretId: data.secretId,
      metadata: data.metadata,
      previousHash,
      timestamp: new Date().toISOString(),
    });

    const currentHash = crypto
      .createHash('sha256')
      .update(hashInput)
      .digest('hex');

    const auditLog = this.auditLogRepository.create({
      action: data.action,
      userId: data.userId || null,
      secretId: data.secretId || null,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      previousHash,
      currentHash,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
    });

    return await this.auditLogRepository.save(auditLog);
  }

  async verifyIntegrity(): Promise<{
    isValid: boolean;
    brokenAt?: string;
  }> {
    const logs = await this.auditLogRepository.find({
      order: { createdAt: 'ASC' },
    });

    for (let i = 1; i < logs.length; i++) {
      const currentLog = logs[i];
      const previousLog = logs[i - 1];

      if (currentLog.previousHash !== previousLog.currentHash) {
        return {
          isValid: false,
          brokenAt: currentLog.id,
        };
      }
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
