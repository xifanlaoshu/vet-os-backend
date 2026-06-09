import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'
import { HospitalizationEntity } from './hospitalization.entity'
import { NursingPlanEntity } from './nursing-plan.entity'

@Entity('vpet_hosp_nursing_execution')
export class NursingExecutionEntity extends CommonEntity {
  @Column({ name: 'hosp_id' })
  hospId: number

  @ManyToOne(() => HospitalizationEntity, hosp => hosp.nursingExecutions)
  @JoinColumn({ name: 'hosp_id' })
  hospitalization: HospitalizationEntity

  @Column({ name: 'plan_id' })
  planId: number

  @ManyToOne(() => NursingPlanEntity, plan => plan.executions)
  @JoinColumn({ name: 'plan_id' })
  plan: NursingPlanEntity

  @Column({ nullable: true, name: 'executor_id' })
  executorId: number

  @Column({ length: 50, nullable: true, name: 'executor_name' })
  executorName: string

  @Column({ type: 'tinyint', default: 2 })
  status: number

  @Column({ type: 'datetime', name: 'executed_at' })
  executedAt: string

  @Column({ length: 255, nullable: true, name: 'result_note' })
  resultNote: string

  @Column({ type: 'json', nullable: true, name: 'vital_signs' })
  vitalSigns: Record<string, any>
}
