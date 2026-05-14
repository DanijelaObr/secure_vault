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
import { SharedSecretPermission } from '../../shared/enums';

@Entity('shared_secrets')
export class SharedSecret {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Secret, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'secretId' })
  secret!: Secret;

  @Column()
  secretId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sharedWithUserId' })
  sharedWithUser!: User;

  @Column()
  sharedWithUserId!: string;

  @Column({ type: 'text' })
  encryptedKey!: string;

  @Column({
    type: 'enum',
    enum: SharedSecretPermission,
    default: SharedSecretPermission.READ,
  })
  permission!: SharedSecretPermission;

  @CreateDateColumn()
  sharedAt!: Date;
}
