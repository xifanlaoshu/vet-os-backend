import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'
import { DoctorEntity } from '~/modules/vpet-appointment/entities/doctor.entity'
import { VisitCareFollowupLabEntity } from './visit-care-followup-lab.entity'
import { VisitCareFollowupPrescriptionEntity } from './visit-care-followup-prescription.entity'
import { VisitEntity } from './visit.entity'

@Index('idx_visit_care_followup_visit', ['visitId'])
@Index('idx_visit_care_followup_batch_no', ['visitId', 'batchNo'], { unique: true })
@Index('idx_visit_care_followup_occurred_at', ['occurredAt'])
@Entity('vpet_visit_care_followup')
export class VisitCareFollowupEntity extends CommonEntity {
  @Column({ name: 'tenant_id', default: 1, comment: '租户 ID' })
  tenantId: number

  @Column({ name: 'area_id', default: 1, comment: '院区 ID' })
  areaId: number

  @Column({ name: 'visit_id' })
  visitId: number

  @ManyToOne(() => VisitEntity, visit => visit.careFollowups, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'visit_id' })
  visit: VisitEntity

  @Column({ name: 'batch_no', length: 30 })
  batchNo: string

  @Column({ type: 'datetime', name: 'occurred_at' })
  occurredAt: string

  @Column({ type: 'tinyint', nullable: true, name: 'care_stage' })
  careStage: number | null

  @Column({ type: 'text', nullable: true, name: 'symptom_summary' })
  symptomSummary: string | null

  @Column({ type: 'text', nullable: true, name: 'status_summary' })
  statusSummary: string | null

  @Column({ type: 'json', nullable: true, name: 'vital_signs' })
  vitalSigns: Record<string, any> | null

  @Column({ type: 'text', nullable: true, name: 'objective_note' })
  objectiveNote: string | null

  @Column({ type: 'text', nullable: true, name: 'assessment_text' })
  assessmentText: string | null

  @Column({ type: 'text', nullable: true, name: 'plan_adjustment' })
  planAdjustment: string | null

  @Column({ type: 'text', nullable: true, name: 'medication_adjustment' })
  medicationAdjustment: string | null

  @Column({ type: 'text', nullable: true })
  remark: string | null

  @Column({ nullable: true, name: 'recorded_by' })
  recordedBy: number | null

  @ManyToOne(() => DoctorEntity, { nullable: true })
  @JoinColumn({ name: 'recorded_by' })
  recorder: DoctorEntity | null

  @OneToMany(() => VisitCareFollowupLabEntity, link => link.followup)
  labLinks: VisitCareFollowupLabEntity[]

  @OneToMany(() => VisitCareFollowupPrescriptionEntity, link => link.followup)
  prescriptionLinks: VisitCareFollowupPrescriptionEntity[]
}
