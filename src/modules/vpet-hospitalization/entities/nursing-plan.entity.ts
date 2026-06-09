import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'
import { DoctorEntity } from '~/modules/vpet-appointment/entities/doctor.entity'
import { HospitalizationEntity } from './hospitalization.entity'
import { NursingExecutionEntity } from './nursing-execution.entity'

@Entity('vpet_hosp_nursing_plan')
export class NursingPlanEntity extends CommonEntity {
  @Column({ name: 'hosp_id' })
  hospId: number

  @ManyToOne(() => HospitalizationEntity, hosp => hosp.nursingPlans)
  @JoinColumn({ name: 'hosp_id' })
  hospitalization: HospitalizationEntity

  @Column({ type: 'tinyint', name: 'plan_type', default: 1 })
  planType: number

  @Column({ length: 150, name: 'plan_name' })
  planName: string

  @Column({ length: 500, nullable: true, name: 'instruction' })
  instruction: string

  @Column({ length: 50, nullable: true })
  frequency: string

  @Column({ type: 'datetime', name: 'scheduled_time' })
  scheduledTime: string

  @Column({ type: 'tinyint', default: 1 })
  status: number

  @Column({ type: 'tinyint', default: 1, name: 'latest_execution_status' })
  latestExecutionStatus: number

  @Column({ type: 'datetime', nullable: true, name: 'latest_execution_at' })
  latestExecutionAt: string

  @Column({ name: 'doctor_id', nullable: true })
  doctorId: number

  @ManyToOne(() => DoctorEntity, { nullable: true })
  @JoinColumn({ name: 'doctor_id' })
  doctor: DoctorEntity

  @OneToMany(() => NursingExecutionEntity, execution => execution.plan)
  executions: NursingExecutionEntity[]
}
