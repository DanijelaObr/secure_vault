import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CryptoService } from './services/crypto.service';
import { AuditService } from './services/audit.service';
import { SecurityService } from './services/security.service';
import { AuditLog } from '../database/entities/audit-log.entity';
import { SuspiciousActivity } from '../database/entities/suspicious-activity.entity';
import { BannedIP } from '../database/entities/banned-ip.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, SuspiciousActivity, BannedIP])],
  providers: [CryptoService, AuditService, SecurityService],
  exports: [CryptoService, AuditService, SecurityService],
})
export class SharedModule {}
