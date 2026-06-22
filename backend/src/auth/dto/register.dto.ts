import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { UserRole } from '../../shared/enums';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(3)
  username!: string;

  @IsString()
  password!: string; // Master password (koristi se samo za bcrypt hash + policy validaciju)

  @IsEnum(UserRole)
  role!: UserRole;

  // ===== ZERO-KNOWLEDGE: klijent generiše i šalje gotove vrijednosti =====

  // Javni ključ (base64 spki)
  @IsString()
  publicKey!: string;

  // Privatni ključ ENKRIPTOVAN master ključem na klijentu (JSON blob)
  @IsString()
  encryptedPrivateKey!: string;

  // PBKDF2 salt (base64)
  @IsString()
  salt!: string;
}
