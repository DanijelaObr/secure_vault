import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('banned_ips')
export class BannedIP {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  ipAddress!: string;

  @Column()
  reason!: string;

  @Column({ nullable: true })
  bannedUntil?: Date;

  @Column({ default: false })
  permanent!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
