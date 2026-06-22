import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VaultService } from './vault.service';
import { VaultController } from './vault.controller';
import { Secret } from '../database/entities/secret.entity';
import { SharedSecret } from '../database/entities/shared-secret.entity';
import { SharedModule } from 'src/shared/shared.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Secret, SharedSecret]),
    SharedModule,
    AdminModule,
  ],
  controllers: [VaultController],
  providers: [VaultService],
})
export class VaultModule {}
