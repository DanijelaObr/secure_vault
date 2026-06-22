import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('security_policies')
export class SecurityPolicy {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Password policy
  @Column({ default: 12 })
  minPasswordLength!: number;

  @Column({ default: true })
  requireUppercase!: boolean;

  @Column({ default: true })
  requireLowercase!: boolean;

  @Column({ default: true })
  requireNumbers!: boolean;

  @Column({ default: true })
  requireSpecialChars!: boolean;

  // Session policy
  @Column({ default: 15 }) // u minutama
  accessTokenDuration!: number;

  @Column({ default: 10080 }) // 7 dana u minutama
  refreshTokenDuration!: number;

  @Column({ default: 30 }) // u minutama
  sessionTimeout!: number;

  // Secret rotation policy
  @Column({ default: 90 }) // u danima
  secretRotationPeriod!: number;

  @Column({ default: true })
  enforceSecretRotation!: boolean;

  // Security settings
  @Column({ default: 5 })
  maxLoginAttempts!: number;

  @Column({ default: 15 }) // u minutama
  accountLockoutDuration!: number;

  @Column({ default: false })
  requireMfaForAdmins!: boolean;

  // Honeypot/SQLi test: admin privremeno "uključuje" ranjivi endpoint
  @Column({ default: false })
  sqlInjectionTestEnabled!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
