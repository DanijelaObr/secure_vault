import { IsString, IsEnum, IsOptional } from 'class-validator';
import { SharedSecretPermission } from '../../shared/enums';

export class ShareSecretDto {
  @IsString()
  sharedWithEmail!: string;

  @IsOptional()
  @IsEnum(SharedSecretPermission)
  permission?: SharedSecretPermission;
}
