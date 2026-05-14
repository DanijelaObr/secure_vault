import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { VaultModule } from './vault/vault.module';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    // Environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database connection
    // Database connection - SA URL!
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get('DB_HOST');
        const port = configService.get('DB_PORT');
        const username = configService.get('DB_USERNAME');
        const password = configService.get('DB_PASSWORD');
        const database = configService.get('DB_DATABASE');

        // Debug
        console.log('🔍 DB Config Debug:');
        console.log('DB_HOST:', host);
        console.log('DB_PORT:', port);
        console.log('DB_USERNAME:', username);
        console.log('DB_PASSWORD:', password);
        const url = `postgresql://${username}:${password}@${host}:${port}/${database}`;
        console.log('📡 Connection URL:', url);

        return {
          type: 'postgres',
          url: url,
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: true,
          logging: true,
          ssl: false,
          extra: {
            connectionTimeoutMillis: 5000,
          },
        };
      },
    }),

    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.get<number>('RATE_LIMIT_TTL') || 60,
            limit: configService.get<number>('RATE_LIMIT_MAX') || 100,
          },
        ],
      }),
    }),

    AuthModule,
    SharedModule,
    VaultModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
