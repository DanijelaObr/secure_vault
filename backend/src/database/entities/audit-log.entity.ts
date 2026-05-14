import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Secret } from './secret.entity';
import { AuditAction } from '../../shared/enums';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action!: AuditAction;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'userId' })
  user!: User | null;

  @Column({ nullable: true })
  userId!: string | null;

  @ManyToOne(() => Secret, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'secretId' })
  secret!: Secret | null;

  @Column({ nullable: true })
  secretId!: string | null;

  @Column({ type: 'text', nullable: true })
  metadata!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  previousHash!: string | null;

  @Column({ type: 'varchar', length: 64 })
  currentHash!: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress!: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
