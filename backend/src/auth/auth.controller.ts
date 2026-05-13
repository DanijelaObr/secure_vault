import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  Request,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard) // ← JWT Guard zaštita!
  async getProfile(@Request() req) {
    // req.user je User objekat koji JWT Strategy vratila!
    return {
      message: 'This is your profile',
      user: {
        id: req.user.id,
        email: req.user.email,
        username: req.user.username,
        role: req.user.role,
        mfaEnabled: req.user.mfaEnabled,
        createdAt: req.user.createdAt,
        lastLoginAt: req.user.lastLoginAt,
      },
    };
  }

  @Post('mfa/enable')
  @UseGuards(JwtAuthGuard)
  async enableMfa(@Request() req) {
    return this.authService.enableMfa(req.user.id);
  }

  @Post('mfa/verify')
  @UseGuards(JwtAuthGuard)
  async verifyMfa(@Request() req, @Body() body: { token: string }) {
    return this.authService.verifyAndEnableMfa(req.user.id, body.token);
  }

  @Post('mfa/disable')
  @UseGuards(JwtAuthGuard)
  async disableMfa(@Request() req, @Body() body: { token: string }) {
    return this.authService.disableMfa(req.user.id, body.token);
  }
}
