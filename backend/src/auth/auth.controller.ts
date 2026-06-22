import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  Request,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import type { Response } from 'express';
import { AdminService } from '../admin/admin.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly adminService: AdminService,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 3600000 } })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 900000 } })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    const result = await this.authService.login(loginDto, ipAddress, userAgent);

    const policy = await this.adminService.getSecurityPolicy();

    if (result.access_token) {
      res.cookie('accessToken', result.access_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: policy.accessTokenDuration * 60 * 1000,
      });
    }

    if (result.refresh_token) {
      res.cookie('refreshToken', result.refresh_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: policy.refreshTokenDuration * 60 * 1000,
      });
    }

    // access_token se NE vraća u body-ju — autentikacija ide preko HttpOnly cookie-ja.
    return {
      user: result.user,
      requiresMfa: result.requiresMfa,
    };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
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
        vaultInitialized: !!req.user.salt,
      },
    };
  }

  /** Kripto materijal trenutnog korisnika (za otključavanje vault-a na klijentu). */
  @Get('crypto-material')
  @UseGuards(JwtAuthGuard)
  async getCryptoMaterial(@Request() req) {
    return this.authService.getCryptoMaterial(req.user.id);
  }

  /** Javni ključ drugog korisnika (za dijeljenje tajni). */
  @Get('public-key/:email')
  @UseGuards(JwtAuthGuard)
  async getPublicKey(@Request() req) {
    return this.authService.getPublicKeyByEmail(req.params.email);
  }

  /** Inicijalizacija vault ključeva (npr. Google korisnik koji nema master password). */
  @Post('setup-vault')
  @UseGuards(JwtAuthGuard)
  async setupVault(
    @Request() req,
    @Body()
    body: { publicKey: string; encryptedPrivateKey: string; salt: string },
  ) {
    return this.authService.setupVaultKeys(
      req.user.id,
      body.publicKey,
      body.encryptedPrivateKey,
      body.salt,
    );
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

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // Redirects to Google
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(
    @Request() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.googleLogin(req.user);
    const policy = await this.adminService.getSecurityPolicy();

    res.cookie('accessToken', result.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: policy.accessTokenDuration * 60 * 1000,
    });

    // Redirect nazad na frontend
    res.redirect('https://localhost:5173/dashboard');
  }

  @Post('refresh')
  async refresh(@Req() req, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    const result = await this.authService.refreshTokens(
      refreshToken,
      ipAddress,
      userAgent,
    );

    const policy = await this.adminService.getSecurityPolicy();

    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: policy.accessTokenDuration * 60 * 1000,
    });

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: policy.refreshTokenDuration * 60 * 1000,
    });

    return { message: 'Tokens refreshed' };
  }

  @Post('logout')
  async logout(@Req() req, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refreshToken;
    await this.authService.logout(refreshToken);
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return { message: 'Logged out successfully' };
  }
}
