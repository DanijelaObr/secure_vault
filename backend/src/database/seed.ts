import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../shared/enums/user-role.enum';
import { getRepositoryToken } from '@nestjs/typeorm';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userRepository = app.get<Repository<User>>(getRepositoryToken(User));

  // Provjeri da li admin već postoji
  const existingAdmin = await userRepository.findOne({
    where: { email: 'admin@securevault.com' },
  });

  if (existingAdmin) {
    console.log('Admin already exists. Skipping seed.');
    await app.close();
    return;
  }

  // Kreiraj admin nalog
  const passwordHash = await bcrypt.hash('Admin123!', 10);

  const admin = userRepository.create({
    email: 'admin@securevault.com',
    username: 'admin',
    passwordHash,
    role: UserRole.ADMIN,
    publicKey: 'dummy-public-key', // Seed nalog bez RSA enkripcije
    encryptedPrivateKey: 'dummy-private-key',
    isActive: true,
  });

  await userRepository.save(admin);

  console.log('Admin account created:');
  console.log('Email: admin@securevault.com');
  console.log('Password: Admin123!');

  await app.close();
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
