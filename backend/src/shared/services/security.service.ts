import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import {
  SuspiciousActivity,
  ActivityType,
} from '../../database/entities/suspicious-activity.entity';
import { BannedIP } from '../../database/entities/banned-ip.entity';

@Injectable()
export class SecurityService {
  constructor(
    @InjectRepository(SuspiciousActivity)
    private suspiciousActivityRepository: Repository<SuspiciousActivity>,
    @InjectRepository(BannedIP)
    private bannedIPRepository: Repository<BannedIP>,
  ) {}

  async logSuspiciousActivity(
    ipAddress: string,
    activityType: ActivityType,
    userId?: string,
    userAgent?: string,
    details?: string,
  ): Promise<void> {
    try {
      await this.suspiciousActivityRepository.save({
        ipAddress,
        activityType,
        userId,
        userAgent,
        details,
      });
    } catch (error) {
      console.error('Failed to log suspicious activity:', error);
    }

    try {
      await this.checkAndBanIP(ipAddress);
    } catch (error) {
      console.error('Failed to check/ban IP:', error);
    }
  }

  async isIPBanned(ipAddress: string): Promise<boolean> {
    try {
      const bannedIP = await this.bannedIPRepository.findOne({
        where: { ipAddress },
      });

      if (!bannedIP) {
        return false;
      }

      if (bannedIP.permanent) {
        return true;
      }

      if (bannedIP.bannedUntil && new Date() > bannedIP.bannedUntil) {
        await this.bannedIPRepository.delete({ ipAddress });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to check banned IP:', error);
      return false;
    }
  }

  private async checkAndBanIP(ipAddress: string): Promise<void> {
    try {
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const recentActivities = await this.suspiciousActivityRepository.count({
        where: {
          ipAddress,
          createdAt: MoreThan(oneHourAgo),
        },
      });

      if (recentActivities >= 10) {
        await this.banIP(
          ipAddress,
          `Automatic ban: ${recentActivities} suspicious activities in 1 hour`,
          false,
          1, // Ban traje 1 minut, moze se povecati
        );
      }
    } catch (error) {
      console.error('Failed in checkAndBanIP:', error);
    }
  }

  async banIP(
    ipAddress: string,
    reason: string,
    permanent = false,
    durationMinutes?: number,
  ): Promise<void> {
    let bannedUntil: Date | undefined;

    if (!permanent && durationMinutes) {
      bannedUntil = new Date();
      bannedUntil.setMinutes(bannedUntil.getMinutes() + durationMinutes);
    }

    await this.bannedIPRepository.save({
      ipAddress,
      reason,
      permanent,
      bannedUntil,
    });
  }

  async unbanIP(ipAddress: string): Promise<void> {
    await this.bannedIPRepository.delete({ ipAddress });
  }

  async getRecentActivities(
    ipAddress?: string,
    limit = 50,
  ): Promise<SuspiciousActivity[]> {
    const query: any = {};
    if (ipAddress) {
      query.ipAddress = ipAddress;
    }

    return this.suspiciousActivityRepository.find({
      where: query,
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getBannedIPs(): Promise<BannedIP[]> {
    return this.bannedIPRepository.find({
      order: { createdAt: 'DESC' },
    });
  }
}
