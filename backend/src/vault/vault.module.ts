import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VaultService } from './vault.service';
import { VaultController } from './vault.controller';
import { Secret } from '../database/entities/secret.entity';
import { SharedSecret } from '../database/entities/shared-secret.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Secret, SharedSecret])],
  controllers: [VaultController],
  providers: [VaultService],
})
export class VaultModule {}
