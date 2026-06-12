import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'
import { ChronicCaseEntity } from './chronic-case.entity'
import { VisitEntity } from './visit.entity'

@Index('idx_vpet_chronic_followup_case', ['chronicCaseId'])
@Index('idx_vpet_chronic_followup_review', ['reviewDate'])
@Entity('vpet_chronic_followup')
export class ChronicFollowupEntity extends CommonEntity {
  @Column({ name: 'tenant_id', default: 1, comment: '租户 ID' })
  tenantId: number

  @Column({ name: 'area_id', default: 1, comment: '院区 ID' })
  areaId: number

  @Column({ name: 'chronic_case_id' })
  chronicCaseId: number

  @ManyToOne(() => ChronicCaseEntity, chronicCase => chronicCase.followups)
  @JoinColumn({ name: 'chronic_case_id' })
  chronicCase: ChronicCaseEntity

  @Column({ nullable: true, name: 'visit_id' })
  visitId: number | null

  @ManyToOne(() => VisitEntity, { nullable: true })
  @JoinColumn({ name: 'visit_id' })
  visit: VisitEntity | null

  @Column({ name: 'review_date', type: 'datetime' })
  reviewDate: string

  @Column({ type: 'text', nullable: true, name: 'symptom_summary' })
  symptomSummary: string | null

  @Column({ type: 'text', nullable: true, name: 'status_summary' })
  statusSummary: string | null

  @Column({ type: 'json', nullable: true, name: 'metric_values' })
  metricValues: Record<string, any> | null

  @Column({ type: 'text', nullable: true, name: 'plan_adjustment' })
  planAdjustment: string | null

  @Column({ type: 'date', nullable: true, name: 'next_review_date' })
  nextReviewDate: string | null

  @Column({ type: 'tinyint', default: 1 })
  status: number
}
