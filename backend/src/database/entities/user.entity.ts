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

  // ===== ZERO-KNOWLEDGE KRIPTO POLJA =====
  // Sve generiše KLIJENT pri registraciji. Server samo skladišti.

  // Javni ključ (base64 spki) — koristi se za dijeljenje tajni.
  @Column({ type: 'text' })
  publicKey!: string;

  // Privatni ključ enkriptovan master ključem NA KLIJENTU (JSON blob: { iv, data }).
  // Server NE može da ga dekriptuje jer nema master password.
  @Column({ type: 'text' })
  encryptedPrivateKey!: string;

  // Salt za PBKDF2 (base64). Potreban klijentu da izvede master ključ pri loginu.
  // Salt nije tajna — bezbedno je čuvati ga na serveru.
  @Column({ type: 'text', nullable: true })
  salt!: string | null;

  // MFA
  @Column({ default: false })
  mfaEnabled!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  mfaSecret!: string | null; // TOTP secret

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
