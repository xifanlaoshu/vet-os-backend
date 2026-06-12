import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'
import { VisitEntity } from './visit.entity'

@Index('idx_visit_queue_event_visit', ['visitId'])
@Index('idx_visit_queue_event_time', ['eventTime'])
@Entity('vpet_visit_queue_event')
export class VisitQueueEventEntity extends CommonEntity {
  @Column({ name: 'tenant_id', default: 1, comment: '租户 ID' })
  tenantId: number

  @Column({ name: 'area_id', default: 1, comment: '院区 ID' })
  areaId: number

  @Column({ name: 'visit_id' })
  visitId: number

  @ManyToOne(() => VisitEntity, visit => visit.queueEvents)
  @JoinColumn({ name: 'visit_id' })
  visit: VisitEntity

  @Column({ type: 'tinyint', name: 'event_type' })
  eventType: number

  @Column({ nullable: true, name: 'queue_no' })
  queueNo: number

  @Column({ nullable: true, name: 'operator_id' })
  operatorId: number

  @Column({ type: 'datetime', name: 'event_time' })
  eventTime: string

  @Column({ length: 200, nullable: true })
  remark: string
}
