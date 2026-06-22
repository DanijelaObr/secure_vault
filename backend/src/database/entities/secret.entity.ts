import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { SecretType } from '../../shared/enums';

@Entity('secrets')
export class Secret {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  // AES-GCM šifrovan sadržaj tajne (JSON blob { iv, data }) — enkriptovan NA KLIJENTU.
  @Column({ type: 'text' })
  encryptedData!: string;

  // AES ključ šifrovan RSA javnim ključem VLASNIKA (base64) — enkriptovan NA KLIJENTU.
  // Server ne može da dekriptuje jer nema privatni ključ vlasnika.
  @Column({ type: 'text', nullable: true })
  encryptedKey!: string | null;

  @Column({
    type: 'enum',
    enum: SecretType,
    default: SecretType.PASSWORD,
  })
  type!: SecretType;

  @Column({ type: 'varchar', nullable: true })
  url!: string | null;

  @Column({ type: 'varchar', nullable: true })
  username!: string | null;

  // NAPOMENA: notes se sada čuva ENKRIPTOVAN unutar encryptedData na klijentu.
  // Ova kolona ostaje radi kompatibilnosti, ali ne treba da sadrži plaintext.
  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ default: false })
  isHoneypot!: boolean;

  @Column({ default: false })
  isFavorite!: boolean;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner!: User;

  @Column()
  ownerId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastAccessedAt!: Date | null;
}
