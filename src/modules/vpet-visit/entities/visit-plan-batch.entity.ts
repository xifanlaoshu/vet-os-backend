import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'
import { DoctorEntity } from '~/modules/vpet-appointment/entities/doctor.entity'
import { VisitEntity } from './visit.entity'

@Index('idx_visit_plan_visit', ['visitId'])
@Index('idx_visit_plan_batch_no', ['visitId', 'batchNo'])
@Entity('vpet_visit_plan_batch')
export class VisitPlanBatchEntity extends CommonEntity {
  @Column({ name: 'tenant_id', default: 1, comment: '租户 ID' })
  tenantId: number

  @Column({ name: 'area_id', default: 1, comment: '院区 ID' })
  areaId: number

  @Column({ name: 'visit_id' })
  visitId: number

  @ManyToOne(() => VisitEntity, visit => visit.planBatches)
  @JoinColumn({ name: 'visit_id' })
  visit: VisitEntity

  @Column({ name: 'batch_no', length: 30 })
  batchNo: string

  @Column({ type: 'tinyint', nullable: true, name: 'care_stage' })
  careStage: number | null

  @Column({ type: 'text', nullable: true, name: 'plan_summary' })
  planSummary: string | null

  @Column({ type: 'text', nullable: true, name: 'doctor_advice' })
  doctorAdvice: string | null

  @Column({ type: 'json', nullable: true, name: 'structured_actions' })
  structuredActions: Array<Record<string, any>> | null

  @Column({ type: 'json', nullable: true, name: 'follow_up_actions' })
  followUpActions: Array<Record<string, any>> | null

  @Column({ type: 'text', nullable: true })
  remark: string | null

  @Column({ nullable: true, name: 'recorded_by' })
  recordedBy: number | null

  @ManyToOne(() => DoctorEntity, { nullable: true })
  @JoinColumn({ name: 'recorded_by' })
  recorder: DoctorEntity | null
}
