import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum ActivityType {
  FAILED_LOGIN = 'failed_login',
  FAILED_DECRYPTION = 'failed_decryption',
  EXPIRED_TOKEN_USE = 'expired_token_use',
  HONEYPOT_ACCESS = 'honeypot_access',
}

@Entity('suspicious_activities')
export class SuspiciousActivity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  ipAddress!: string;

  @Column({
    type: 'enum',
    enum: ActivityType,
  })
  activityType!: ActivityType;

  @Column({ nullable: true })
  userId?: string;

  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  @Column({ type: 'text', nullable: true })
  details?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
