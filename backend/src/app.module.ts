import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { VaultModule } from './vault/vault.module';
import { SharedModule } from './shared/shared.module';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { SecurityPolicy } from './database/entities/security-policy.entity';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    AdminModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
        logging: true,
      }),
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.get<number>('RATE_LIMIT_TTL') || 60000,
            limit: configService.get<number>('RATE_LIMIT_MAX') || 10,
          },
        ],
        storage: new ThrottlerStorageRedisService({
          host: configService.get<string>('REDIS_HOST') || 'localhost',
          port: configService.get<number>('REDIS_PORT') || 6379,
        }),
      }),
    }),
    SharedModule,
    AuthModule,
    VaultModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // {
    //   provide: APP_GUARD,
    //   useClass: ThrottlerGuard,
    // },
  ],
})
export class AppModule {}
