import { IsEmail, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;

  // MFA code (opciono pri login-u, obavezno ako je MFA enabled)
  @IsOptional()
  @IsString()
  mfaCode?: string;
}
