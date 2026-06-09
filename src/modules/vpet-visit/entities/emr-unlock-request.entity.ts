import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'
import { VisitEmrEntity } from './visit-emr.entity'
import { VisitEntity } from './visit.entity'

@Index('idx_vpet_emr_unlock_visit', ['visitId'])
@Index('idx_vpet_emr_unlock_status', ['requestStatus'])
@Entity('vpet_emr_unlock_request')
export class EmrUnlockRequestEntity extends CommonEntity {
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

  @Column({ length: 500, name: 'request_reason' })
  requestReason: string

  @Column({ nullable: true, name: 'requested_by' })
  requestedBy: number | null

  @Column({ type: 'tinyint', default: 1, name: 'request_status' })
  requestStatus: number

  @Column({ nullable: true, name: 'reviewed_by' })
  reviewedBy: number | null

  @Column({ type: 'datetime', nullable: true, name: 'reviewed_at' })
  reviewedAt: string | null

  @Column({ length: 500, nullable: true, name: 'review_remark' })
  reviewRemark: string | null
}
