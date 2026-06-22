import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { SecurityPolicy } from './entities/security-policy.entity';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../shared/enums/user-role.enum';
import { getRepositoryToken } from '@nestjs/typeorm';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userRepository = app.get<Repository<User>>(getRepositoryToken(User));
  const policyRepository = app.get<Repository<SecurityPolicy>>(
    getRepositoryToken(SecurityPolicy),
  );

  // ===== SECURITY POLICY (mora postojati prije registracije/logina) =====
  const existingPolicy = await policyRepository.findOne({ where: {} });
  if (!existingPolicy) {
    // Sve vrijednosti su default iz entiteta; čuvamo prazan red da se popune.
    const policy = policyRepository.create({});
    await policyRepository.save(policy);
    console.log('Default security policy created.');
  } else {
    console.log('Security policy already exists.');
  }

  // ===== ADMIN NALOG =====
  const existingAdmin = await userRepository.findOne({
    where: { email: 'admin@securevault.com' },
  });

  if (existingAdmin) {
    console.log('Admin already exists. Skipping admin seed.');
    await app.close();
    return;
  }

  const passwordHash = await bcrypt.hash('Admin123!', 10);

  const admin = userRepository.create({
    email: 'admin@securevault.com',
    username: 'admin',
    passwordHash,
    role: UserRole.ADMIN,
    // ZERO-KNOWLEDGE: server ne generiše ključeve. Admin pri prvom loginu
    // postavlja vault master password na klijentu (poziv /auth/setup-vault),
    // čime se generišu i čuvaju publicKey/encryptedPrivateKey/salt.
    publicKey: '',
    encryptedPrivateKey: '',
    salt: null,
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
