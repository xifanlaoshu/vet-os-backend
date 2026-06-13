import { Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'
import { VisitEntity } from './visit.entity'

@Index('idx_visit_emr_visit', ['visitId'], { unique: true })
@Entity('vpet_visit_emr')
export class VisitEmrEntity extends CommonEntity {
  @Column({ name: 'tenant_id', default: 1, comment: '租户 ID' })
  tenantId: number

  @Column({ name: 'area_id', default: 1, comment: '院区 ID' })
  areaId: number

  @Column({ name: 'visit_id' })
  visitId: number

  @OneToOne(() => VisitEntity, visit => visit.emr)
  @JoinColumn({ name: 'visit_id' })
  visit: VisitEntity

  @Column({ type: 'text', nullable: true, name: 'chief_complaint' })
  chiefComplaint: string

  @Column({ type: 'json', nullable: true, name: 'physical_exam' })
  physicalExam: Record<string, any> | null

  @Column({ type: 'decimal', precision: 5, scale: 1, nullable: true })
  temperature: number | null

  @Column({ type: 'int', nullable: true, name: 'heart_rate' })
  heartRate: number | null

  @Column({ type: 'int', nullable: true, name: 'respiratory_rate' })
  respiratoryRate: number | null

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true, name: 'body_weight' })
  bodyWeight: number | null

  @Column({ type: 'text', nullable: true, name: 'assessment_text' })
  assessmentText: string

  @Column({ type: 'text', nullable: true, name: 'plan_text' })
  planText: string

  @Column({ type: 'text', nullable: true, name: 'doctor_advice' })
  doctorAdvice: string

  @Column({ type: 'tinyint', default: 0 })
  locked: number

  @Column({ type: 'datetime', nullable: true, name: 'locked_at' })
  lockedAt: string

  @Column({ type: 'tinyint', nullable: true, name: 'quality_score' })
  qualityScore: number
}
