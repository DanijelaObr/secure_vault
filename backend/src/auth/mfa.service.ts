import { Injectable } from '@nestjs/common';
import { authenticator } from '@otplib/preset-default';
import * as QRCode from 'qrcode';

@Injectable()
export class MfaService {
  /**
   * Generiše MFA secret za korisnika
   */
  generateSecret(): string {
    return authenticator.generateSecret();
  }

  /**
   * Generiše QR kod URL za Google Authenticator
   */
  generateQrCodeUrl(email: string, secret: string): string {
    const appName = 'SecureVault';
    return authenticator.keyuri(email, appName, secret);
  }

  /**
   * Generiše QR kod sliku (base64 string)
   */
  async generateQrCode(otpAuthUrl: string): Promise<string> {
    try {
      return await QRCode.toDataURL(otpAuthUrl);
    } catch (error) {
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Validira TOTP kod (6-cifreni kod iz Google Authenticator-a)
   */
  verifyToken(token: string, secret: string): boolean {
    try {
      return authenticator.verify({ token, secret });
    } catch (error) {
      return false;
    }
  }
}
