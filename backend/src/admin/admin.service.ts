import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SecurityPolicy } from '../database/entities/security-policy.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(SecurityPolicy)
    private securityPolicyRepository: Repository<SecurityPolicy>,
  ) {}

  async getSecurityPolicy(): Promise<SecurityPolicy> {
    const policy = await this.securityPolicyRepository.findOne({
      where: {},
    });

    if (!policy) {
      throw new NotFoundException('Security policy not found');
    }

    return policy;
  }

  async updateSecurityPolicy(
    updates: Partial<SecurityPolicy>,
  ): Promise<SecurityPolicy> {
    const policy = await this.getSecurityPolicy();

    Object.assign(policy, updates);

    return this.securityPolicyRepository.save(policy);
  }

  async validatePassword(password: string): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const policy = await this.getSecurityPolicy();
    const errors: string[] = [];

    if (password.length < policy.minPasswordLength) {
      errors.push(
        `Password must be at least ${policy.minPasswordLength} characters long`,
      );
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (policy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (
      policy.requireSpecialChars &&
      !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    ) {
      errors.push('Password must contain at least one special character');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
