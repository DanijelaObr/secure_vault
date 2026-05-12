import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { UserRole } from '../../shared/enums';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(3)
  username!: string;

  @IsString()
  @MinLength(8)
  password!: string; // Master password

  @IsEnum(UserRole)
  role!: UserRole;
}
