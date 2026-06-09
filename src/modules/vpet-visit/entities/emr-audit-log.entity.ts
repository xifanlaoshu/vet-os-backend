import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'
import { VisitEmrEntity } from './visit-emr.entity'
import { VisitEntity } from './visit.entity'

@Index('idx_vpet_emr_audit_visit', ['visitId'])
@Index('idx_vpet_emr_audit_action', ['action'])
@Entity('vpet_emr_audit_log')
export class EmrAuditLogEntity extends CommonEntity {
  @Column({ name: 'visit_id' })
  visitId: number

  @ManyToOne(() => VisitEntity)
  @JoinColumn({ name: 'visit_id' })
  visit: VisitEntity

  @Column({ nullable: true, name: 'emr_id' })
  emrId: number | null

  @ManyToOne(() => VisitEmrEntity, { nullable: true })
  @JoinColumn({ name: 'emr_id' })
  emr: VisitEmrEntity | null

  @Column({ length: 40 })
  action: string

  @Column({ type: 'json', nullable: true, name: 'before_snapshot' })
  beforeSnapshot: Record<string, any> | null

  @Column({ type: 'json', nullable: true, name: 'after_snapshot' })
  afterSnapshot: Record<string, any> | null

  @Column({ length: 500, nullable: true })
  reason: string | null

  @Column({ nullable: true, name: 'operator_id' })
  operatorId: number | null
}
