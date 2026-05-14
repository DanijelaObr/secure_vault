import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CryptoService } from './services/crypto.service';
import { AuditService } from './services/audit.service';
import { AuditLog } from '../database/entities/audit-log.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [CryptoService, AuditService],
  exports: [CryptoService, AuditService],
})
export class SharedModule {}
