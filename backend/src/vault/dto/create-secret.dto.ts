import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { SecretType } from '../../shared/enums';

export class CreateSecretDto {
  @IsString()
  title!: string;

  // AES-GCM šifrovan sadržaj (enkriptovan na klijentu)
  @IsString()
  encryptedData!: string;

  // AES ključ šifrovan RSA javnim ključem vlasnika (enkriptovan na klijentu)
  @IsString()
  encryptedKey!: string;

  @IsEnum(SecretType)
  type!: SecretType;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;
}
