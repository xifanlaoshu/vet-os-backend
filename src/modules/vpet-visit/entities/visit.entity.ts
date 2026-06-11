import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'
import { DoctorEntity } from '~/modules/vpet-appointment/entities/doctor.entity'
import { CustomerEntity } from '~/modules/vpet-customer/entities/customer.entity'
import { PetEntity } from '~/modules/vpet-pet/entities/pet.entity'
import { ChronicCaseEntity } from './chronic-case.entity'
import { VisitCareFollowupEntity } from './visit-care-followup.entity'
import { VisitDiagnosisEntity } from './visit-diagnosis.entity'
import { VisitEmrEntity } from './visit-emr.entity'
import { VisitMediaBatchEntity } from './visit-media-batch.entity'
import { VisitPlanBatchEntity } from './visit-plan-batch.entity'
import { VisitProgressBatchEntity } from './visit-progress-batch.entity'
import { VisitQueueEventEntity } from './visit-queue-event.entity'

@Index('idx_visit_pet', ['petId'])
@Index('idx_visit_status', ['status'])
@Index('idx_visit_no', ['visitNo'], { unique: true })
@Entity('vpet_visit')
export class VisitEntity extends CommonEntity {
  @Column({ length: 20, unique: true, name: 'visit_no' })
  visitNo: string

  @Column({ nullable: true, name: 'appointment_id' })
  appointmentId: number

  @Column({ name: 'pet_id', nullable: true })
  petId: number

  @ManyToOne(() => PetEntity)
  @JoinColumn({ name: 'pet_id' })
  pet: PetEntity

  @Column({ name: 'customer_id', nullable: true })
  customerId: number

  @ManyToOne(() => CustomerEntity)
  @JoinColumn({ name: 'customer_id' })
  customer: CustomerEntity

  @Column({ type: 'tinyint' })
  type: number

  @Column({ type: 'tinyint', default: 1 })
  status: number

  @Column({ type: 'tinyint', default: 1, name: 'care_mode' })
  careMode: number

  @Column({ type: 'tinyint', default: 1, name: 'care_stage' })
  careStage: number

  @Column({ length: 30, nullable: true })
  department: string

  @Column({ nullable: true, name: 'doctor_id' })
  doctorId: number

  @ManyToOne(() => DoctorEntity, { nullable: true })
  @JoinColumn({ name: 'doctor_id' })
  doctor: DoctorEntity | null

  @Column({ type: 'datetime', nullable: true, name: 'triage_time' })
  triageTime: string

  @Column({ type: 'datetime', nullable: true, name: 'call_time' })
  callTime: string

  @Column({ type: 'datetime', nullable: true, name: 'start_time' })
  startTime: string

  @Column({ type: 'datetime', nullable: true, name: 'end_time' })
  endTime: string

  @Column({ type: 'text', nullable: true, name: 'chief_complaint' })
  chiefComplaint: string

  @Column({ type: 'json', nullable: true, name: 'physical_exam' })
  physicalExam: any

  @Column({ type: 'json', nullable: true })
  diagnosis: any

  @Column({ type: 'text', nullable: true, name: 'treatment_plan' })
  treatmentPlan: string

  @Column({ type: 'text', nullable: true, name: 'doctor_advice' })
  doctorAdvice: string

  @Column({ type: 'date', nullable: true, name: 'follow_up_date' })
  followUpDate: string

  @Column({ type: 'json', nullable: true, name: 'ongoing_flags' })
  ongoingFlags: Record<string, any> | null

  @Column({ type: 'tinyint', default: 0 })
  locked: number

  @Column({ nullable: true, name: 'queue_number' })
  queueNumber: number

  @OneToOne(() => VisitEmrEntity, emr => emr.visit)
  emr: VisitEmrEntity

  @OneToMany(() => VisitDiagnosisEntity, diagnosis => diagnosis.visit)
  diagnoses: VisitDiagnosisEntity[]

  @OneToMany(() => VisitProgressBatchEntity, progress => progress.visit)
  progressBatches: VisitProgressBatchEntity[]

  @OneToMany(() => VisitPlanBatchEntity, plan => plan.visit)
  planBatches: VisitPlanBatchEntity[]

  @OneToMany(() => ChronicCaseEntity, chronicCase => chronicCase.visit)
  chronicCases: ChronicCaseEntity[]

  @OneToMany(() => VisitQueueEventEntity, queueEvent => queueEvent.visit)
  queueEvents: VisitQueueEventEntity[]

  @OneToMany(() => VisitCareFollowupEntity, followup => followup.visit)
  careFollowups: VisitCareFollowupEntity[]

  @OneToMany(() => VisitMediaBatchEntity, batch => batch.visit)
  mediaBatches: VisitMediaBatchEntity[]
}
