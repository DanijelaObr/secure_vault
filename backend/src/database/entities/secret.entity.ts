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

  @Column({ type: 'text' })
  encryptedData!: string;

  @Column({
    type: 'enum',
    enum: SecretType,
    default: SecretType.PASSWORD,
  })
  type!: SecretType;

  @Column({ type: 'varchar', nullable: true }) // ← DODAJ type!
  url!: string | null;

  @Column({ type: 'varchar', nullable: true }) // ← DODAJ type!
  username!: string | null;

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
