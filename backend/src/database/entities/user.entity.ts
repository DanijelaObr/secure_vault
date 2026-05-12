import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../../shared/enums';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  username!: string;

  @Column()
  passwordHash!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.DEVELOPER,
  })
  role!: UserRole;

  // Public key za asimetričnu kriptografiju (dijeljenje tajni)
  @Column({ type: 'text' })
  publicKey!: string;

  // Enkriptovani private key (enkriptovan master password-om korisnika)
  @Column({ type: 'text' })
  encryptedPrivateKey!: string;

  // MFA
  @Column({ default: false })
  mfaEnabled!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  mfaSecret!: string | null; // TOTP secret (enkriptovan)

  // Account status
  @Column({ default: true })
  isActive!: boolean;

  @Column({ default: false })
  isFrozen!: boolean; // Za honeypot detekciju

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt!: Date | null;
}
