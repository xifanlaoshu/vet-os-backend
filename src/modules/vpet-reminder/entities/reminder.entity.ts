import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'
import { CustomerEntity } from '~/modules/vpet-customer/entities/customer.entity'
import { PetEntity } from '~/modules/vpet-pet/entities/pet.entity'
import { VisitEntity } from '~/modules/vpet-visit/entities/visit.entity'

@Index('idx_vpet_reminder_due', ['dueDate'])
@Index('idx_vpet_reminder_status', ['status'])
@Entity('vpet_reminder')
export class ReminderEntity extends CommonEntity {
  @Column({ name: 'customer_id' })
  customerId: number

  @ManyToOne(() => CustomerEntity)
  @JoinColumn({ name: 'customer_id' })
  customer: CustomerEntity

  @Column({ name: 'pet_id' })
  petId: number

  @ManyToOne(() => PetEntity)
  @JoinColumn({ name: 'pet_id' })
  pet: PetEntity

  @Column({ name: 'visit_id', nullable: true })
  visitId: number

  @ManyToOne(() => VisitEntity, { nullable: true })
  @JoinColumn({ name: 'visit_id' })
  visit: VisitEntity

  @Column({ type: 'tinyint' })
  type: number

  @Column({ name: 'reminder_name', length: 100 })
  reminderName: string

  @Column({ type: 'date', name: 'due_date' })
  dueDate: string

  @Column({ type: 'datetime', nullable: true, name: 'last_reminded_at' })
  lastRemindedAt: string

  @Column({ type: 'datetime', nullable: true, name: 'completed_at' })
  completedAt: string

  @Column({ type: 'tinyint', default: 1 })
  status: number

  @Column({ length: 20, nullable: true })
  channel: string

  @Column({ length: 255, nullable: true })
  remark: string

  @Column({ type: 'json', nullable: true, name: 'customer_snapshot' })
  customerSnapshot: Record<string, any>

  @Column({ type: 'json', nullable: true, name: 'pet_snapshot' })
  petSnapshot: Record<string, any>
}
