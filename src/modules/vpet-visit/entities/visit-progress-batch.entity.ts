import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'
import { VisitEntity } from './visit.entity'

@Index('idx_visit_progress_visit', ['visitId'])
@Index('idx_visit_progress_batch_no', ['visitId', 'batchNo'], { unique: true })
@Entity('vpet_visit_progress_batch')
export class VisitProgressBatchEntity extends CommonEntity {
  @Column({ name: 'visit_id' })
  visitId: number

  @ManyToOne(() => VisitEntity, visit => visit.progressBatches)
  @JoinColumn({ name: 'visit_id' })
  visit: VisitEntity

  @Column({ name: 'batch_no', length: 30 })
  batchNo: string

  @Column({ type: 'tinyint', nullable: true, name: 'care_stage' })
  careStage: number | null

  @Column({ type: 'text', nullable: true, name: 'symptom_summary' })
  symptomSummary: string | null

  @Column({ type: 'text', nullable: true, name: 'status_summary' })
  statusSummary: string | null

  @Column({ type: 'json', nullable: true, name: 'physical_exam' })
  physicalExam: Record<string, any> | null

  @Column({ type: 'text', nullable: true, name: 'assessment_text' })
  assessmentText: string | null

  @Column({ type: 'json', nullable: true, name: 'diagnosis_snapshot' })
  diagnosisSnapshot: Array<Record<string, any>> | null

  @Column({ type: 'text', nullable: true })
  remark: string | null

  @Column({ nullable: true, name: 'recorded_by' })
  recordedBy: number | null
}
