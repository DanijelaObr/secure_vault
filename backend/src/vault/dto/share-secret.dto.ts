import { IsString, IsEnum, IsOptional } from 'class-validator';
import { SharedSecretPermission } from '../../shared/enums';

export class ShareSecretDto {
  @IsString()
  sharedWithEmail!: string;

  // AES ključ tajne RE-ENKRIPTOVAN javnim ključem primaoca (na klijentu).
  // Server ovaj blob samo skladišti — ne radi kripto.
  @IsString()
  encryptedKey!: string;

  @IsOptional()
  @IsEnum(SharedSecretPermission)
  permission?: SharedSecretPermission;
}
