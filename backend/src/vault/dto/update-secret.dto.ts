import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { SecretType } from '../../shared/enums';

export class UpdateSecretDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  encryptedData?: string;

  @IsOptional()
  @IsString()
  encryptedKey?: string;

  @IsOptional()
  @IsEnum(SecretType)
  type?: SecretType;

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
