import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { SecretType } from '../../shared/enums';

export class CreateSecretDto {
  @IsString()
  title!: string;

  @IsString()
  encryptedData!: string; // Frontend će enkriptovati prije slanja!

  @IsEnum(SecretType)
  type!: SecretType;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;
}
