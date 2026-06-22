import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  // HTTPS sertifikat (mkcert) iz foldera certs u rootu projekta.
  // __dirname je dist/ poslije builda, pa idemo dva nivoa gore do backend/, pa u ../certs.
  // Imena fajlova prilagodi onome što ti je mkcert generisao.
  const certDir = path.resolve(__dirname, '..', '..', 'certs');
  const httpsOptions = {
    key: fs.readFileSync(path.join(certDir, 'localhost+1-key.pem')),
    cert: fs.readFileSync(path.join(certDir, 'localhost+1.pem')),
  };

  const app = await NestFactory.create(AppModule, { httpsOptions });

  app.enableCors({
    origin: ['https://localhost:5173', 'https://localhost:5174'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(3000);
  console.log('Backend running on https://localhost:3000');
}
bootstrap();
