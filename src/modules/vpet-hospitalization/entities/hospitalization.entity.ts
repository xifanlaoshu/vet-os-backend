import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'
import { DoctorEntity } from '~/modules/vpet-appointment/entities/doctor.entity'
import { CustomerEntity } from '~/modules/vpet-customer/entities/customer.entity'
import { PetEntity } from '~/modules/vpet-pet/entities/pet.entity'
import { VisitEntity } from '~/modules/vpet-visit/entities/visit.entity'
import { NursingExecutionEntity } from './nursing-execution.entity'
import { NursingPlanEntity } from './nursing-plan.entity'

@Index('idx_vpet_hosp_no', ['hospNo'], { unique: true })
@Index('idx_vpet_hosp_visit', ['visitId'], { unique: true })
@Index('idx_vpet_hosp_status', ['status'])
@Entity('vpet_hospitalization')
export class HospitalizationEntity extends CommonEntity {
  @Column({ name: 'hosp_no', length: 30, unique: true })
  hospNo: string

  @Column({ name: 'visit_id', unique: true })
  visitId: number

  @ManyToOne(() => VisitEntity)
  @JoinColumn({ name: 'visit_id' })
  visit: VisitEntity

  @Column({ name: 'customer_id' })
  customerId: number

  @ManyToOne(() => CustomerEntity)
  @JoinColumn({ name: 'customer_id' })
  customer: CustomerEntity

  @Column({ name: 'pet_id' })
  petId: number

  @ManyToOne(() => PetEntity)
  @JoinColumn({ name: 'pet_id' })
  pet: PetEntity

  @Column({ name: 'doctor_id', nullable: true })
  doctorId: number

  @ManyToOne(() => DoctorEntity, { nullable: true })
  @JoinColumn({ name: 'doctor_id' })
  doctor: DoctorEntity

  @Column({ length: 30, nullable: true, name: 'cage_code' })
  cageCode: string

  @Column({ type: 'datetime', name: 'admission_at' })
  admissionAt: string

  @Column({ type: 'datetime', nullable: true, name: 'discharge_at' })
  dischargeAt: string

  @Column({ type: 'tinyint', default: 1 })
  status: number

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0, name: 'daily_fee' })
  dailyFee: number

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'deposit_amount' })
  depositAmount: number

  @Column({ type: 'tinyint', default: 1, name: 'nursing_level' })
  nursingLevel: number

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true, name: 'weight_at_admission' })
  weightAtAdmission: number

  @Column({ length: 255, nullable: true, name: 'admission_diagnosis' })
  admissionDiagnosis: string

  @Column({ length: 255, nullable: true, name: 'discharge_summary' })
  dischargeSummary: string

  @Column({ length: 255, nullable: true })
  remark: string

  @Column({ type: 'json', nullable: true, name: 'customer_snapshot' })
  customerSnapshot: Record<string, any>

  @Column({ type: 'json', nullable: true, name: 'pet_snapshot' })
  petSnapshot: Record<string, any>

  @Column({ type: 'json', nullable: true, name: 'doctor_snapshot' })
  doctorSnapshot: Record<string, any>

  @OneToMany(() => NursingPlanEntity, plan => plan.hospitalization)
  nursingPlans: NursingPlanEntity[]

  @OneToMany(() => NursingExecutionEntity, execution => execution.hospitalization)
  nursingExecutions: NursingExecutionEntity[]
}
