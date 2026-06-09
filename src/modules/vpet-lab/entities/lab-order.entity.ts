import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'
import { DoctorEntity } from '~/modules/vpet-appointment/entities/doctor.entity'
import { CustomerEntity } from '~/modules/vpet-customer/entities/customer.entity'
import { PetEntity } from '~/modules/vpet-pet/entities/pet.entity'
import { VisitEntity } from '~/modules/vpet-visit/entities/visit.entity'
import { LabResultItemEntity } from './lab-result-item.entity'
import { LisOrderEntity } from './lis-order.entity'

@Index('idx_vpet_lab_order_no', ['orderNo'], { unique: true })
@Index('idx_vpet_lab_visit', ['visitId'])
@Index('idx_vpet_lab_status', ['status'])
@Entity('vpet_lab_order')
export class LabOrderEntity extends CommonEntity {
  @Column({ name: 'order_no', length: 30, unique: true })
  orderNo: string

  @Column({ name: 'visit_id' })
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

  @Column({ length: 100, name: 'test_name' })
  testName: string

  @Column({ nullable: true, name: 'template_id' })
  templateId: number | null

  @Column({ length: 100, nullable: true, name: 'template_name' })
  templateName: string | null

  @Column({ type: 'tinyint', default: 1 })
  category: number

  @Column({ length: 50, nullable: true, name: 'sample_type' })
  sampleType: string

  @Column({ length: 30, nullable: true, name: 'source_type' })
  sourceType: string | null

  @Column({ nullable: true, name: 'source_id' })
  sourceId: number | null

  @Column({ type: 'tinyint', default: 1 })
  status: number

  @Column({ type: 'datetime', name: 'requested_at' })
  requestedAt: string

  @Column({ type: 'datetime', nullable: true, name: 'sampled_at' })
  sampledAt: string

  @Column({ type: 'datetime', nullable: true, name: 'reported_at' })
  reportedAt: string

  @Column({ type: 'text', nullable: true, name: 'report_summary' })
  reportSummary: string

  @Column({ type: 'int', default: 0, name: 'abnormal_count' })
  abnormalCount: number

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'charge_amount' })
  chargeAmount: number

  @Column({ type: 'json', nullable: true, name: 'customer_snapshot' })
  customerSnapshot: Record<string, any>

  @Column({ type: 'json', nullable: true, name: 'pet_snapshot' })
  petSnapshot: Record<string, any>

  @Column({ type: 'json', nullable: true, name: 'template_snapshot' })
  templateSnapshot: Record<string, any> | null

  @Column({ type: 'json', nullable: true, name: 'structured_report' })
  structuredReport: Record<string, any> | null

  @Column({ type: 'json', nullable: true, name: 'raw_report_files' })
  rawReportFiles: Array<Record<string, any>> | null

  @OneToMany(() => LabResultItemEntity, item => item.labOrder, { cascade: true })
  resultItems: LabResultItemEntity[]

  @OneToOne(() => LisOrderEntity, lisOrder => lisOrder.labOrder)
  lisOrder: LisOrderEntity
}
