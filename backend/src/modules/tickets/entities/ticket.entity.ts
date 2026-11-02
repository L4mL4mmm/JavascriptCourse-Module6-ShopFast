import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TicketStatus, ProposalStatus } from '../../../common/enums';
import { User } from '../../users/entities/user.entity';

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  ticketNumber: string;

  @ManyToOne(() => User, (user) => user.tickets)
  @JoinColumn({ name: 'customerId' })
  customer: User;

  @Index()
  @Column({ type: 'uuid' })
  customerId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assignedAgentId' })
  assignedAgent?: User;

  @Column({ type: 'uuid', nullable: true })
  assignedAgentId?: string;

  @Index()
  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.OPEN,
  })
  status: TicketStatus;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  orderId?: string;

  // AI Human-In-The-Loop fields
  @Column({ type: 'varchar', length: 100, nullable: true })
  proposedAction?: string; // e.g. CANCEL_ORDER, REFUND_ORDER, UPDATE_SHIPPING_ADDRESS

  @Column({ type: 'jsonb', nullable: true })
  actionPayload?: Record<string, any>;

  @Index()
  @Column({
    type: 'enum',
    enum: ProposalStatus,
    default: ProposalStatus.PENDING,
  })
  proposalStatus: ProposalStatus;

  @Column({ type: 'text', nullable: true })
  resolutionNotes?: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
