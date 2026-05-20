import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectDataSource() private dataSource: DataSource,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('setup-database')
  async setupDatabase() {
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      // Drop existing
      await queryRunner.query(`
      DROP TABLE IF EXISTS shared_secrets CASCADE;
      DROP TABLE IF EXISTS audit_logs CASCADE;
      DROP TABLE IF EXISTS secrets CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TYPE IF EXISTS users_role_enum CASCADE;
      DROP TYPE IF EXISTS secrets_type_enum CASCADE;
      DROP TYPE IF EXISTS audit_logs_action_enum CASCADE;
      DROP TYPE IF EXISTS shared_secrets_permission_enum CASCADE;
    `);

      // Create enums
      await queryRunner.query(`
      CREATE TYPE users_role_enum AS ENUM('admin', 'team_lead', 'developer');
      CREATE TYPE secrets_type_enum AS ENUM('password', 'api_key', 'ssh_key', 'certificate', 'note', 'other');
      CREATE TYPE audit_logs_action_enum AS ENUM('user_register', 'user_login', 'user_logout', 'secret_create', 'secret_read', 'secret_update', 'secret_delete', 'secret_share', 'secret_revoke_share', 'honeypot_triggered', 'mfa_enabled', 'mfa_disabled');
      CREATE TYPE shared_secrets_permission_enum AS ENUM('read', 'write');
    `);

      // Create tables
      await queryRunner.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(255) NOT NULL,
        "passwordHash" VARCHAR(255) NOT NULL,
        role users_role_enum NOT NULL DEFAULT 'developer',
        "publicKey" TEXT NOT NULL,
        "encryptedPrivateKey" TEXT NOT NULL,
        "mfaEnabled" BOOLEAN DEFAULT false,
        "mfaSecret" VARCHAR(255),
        "isActive" BOOLEAN DEFAULT true,
        "isFrozen" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "lastLoginAt" TIMESTAMP
      );
    `);

      await queryRunner.query(`
      CREATE TABLE secrets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(255) NOT NULL,
        "encryptedData" TEXT NOT NULL,
        type secrets_type_enum DEFAULT 'password',
        url VARCHAR(255),
        username VARCHAR(255),
        notes TEXT,
        "isHoneypot" BOOLEAN DEFAULT false,
        "isFavorite" BOOLEAN DEFAULT false,
        "ownerId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "lastAccessedAt" TIMESTAMP
      );
    `);

      await queryRunner.query(`
      CREATE TABLE audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        action audit_logs_action_enum NOT NULL,
        "userId" UUID REFERENCES users(id) ON DELETE SET NULL,
        "secretId" UUID REFERENCES secrets(id) ON DELETE SET NULL,
        metadata TEXT,
        "previousHash" VARCHAR(64),
        "currentHash" VARCHAR(64) NOT NULL,
        "ipAddress" VARCHAR(45),
        "userAgent" TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

      await queryRunner.query(`
      CREATE TABLE shared_secrets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "secretId" UUID NOT NULL REFERENCES secrets(id) ON DELETE CASCADE,
        "sharedWithUserId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "encryptedKey" TEXT NOT NULL,
        permission shared_secrets_permission_enum DEFAULT 'read',
        "sharedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Database schema created successfully!',
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      return {
        success: false,
        message: 'Database setup failed',
        error: error.message,
      };
    } finally {
      await queryRunner.release();
    }
  }
}
