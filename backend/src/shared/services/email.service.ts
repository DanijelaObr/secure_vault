import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as SMTPTransport from 'nodemailer/lib/smtp-transport';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    const smtpConfig: SMTPTransport.Options = {
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: false,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASSWORD'),
      },
      tls: {
        rejectUnauthorized: false,
      },
    };

    this.transporter = nodemailer.createTransport(smtpConfig);
  }

  async sendHoneypotAlert(
    userEmail: string,
    secretName: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
    const emailFrom = this.configService.get<string>('EMAIL_FROM');

    const mailOptions = {
      from: emailFrom,
      to: adminEmail,
      subject: 'SECURITY ALERT: Honeypot Secret Accessed',
      html: `
        <h2>Security Alert: Honeypot Access Detected</h2>
        <p>A honeypot secret has been accessed. The user account has been automatically frozen.</p>
        
        <h3>Details:</h3>
        <ul>
          <li><strong>User:</strong> ${userEmail}</li>
          <li><strong>Secret Name:</strong> ${secretName}</li>
          <li><strong>IP Address:</strong> ${ipAddress}</li>
          <li><strong>User Agent:</strong> ${userAgent}</li>
          <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
        </ul>
        
        <p><strong>Action Taken:</strong> User account has been frozen and requires administrator review.</p>
        
        <hr>
        <p style="color: #666; font-size: 12px;">
          This is an automated security alert from SecureVault Password Manager.
        </p>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('Honeypot alert email sent successfully');
    } catch (error) {
      console.error('Failed to send honeypot alert email:', error);
    }
  }
}
