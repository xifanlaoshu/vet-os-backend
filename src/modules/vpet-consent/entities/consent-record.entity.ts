import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'
import { DoctorEntity } from '~/modules/vpet-appointment/entities/doctor.entity'
import { CustomerEntity } from '~/modules/vpet-customer/entities/customer.entity'
import { PetEntity } from '~/modules/vpet-pet/entities/pet.entity'
import { VisitEntity } from '~/modules/vpet-visit/entities/visit.entity'
import { ConsentTemplateEntity } from './consent-template.entity'

@Index('idx_vpet_consent_record_no', ['recordNo'], { unique: true })
@Index('idx_vpet_consent_record_visit', ['visitId'])
@Index('idx_vpet_consent_record_status', ['status'])
@Entity('vpet_consent_record')
export class ConsentRecordEntity extends CommonEntity {
  @Column({ name: 'tenant_id', default: 1, comment: '租户 ID' })
  tenantId: number

  @Column({ name: 'area_id', default: 1, comment: '院区 ID' })
  areaId: number

  @Column({ length: 30, unique: true, name: 'record_no' })
  recordNo: string

  @Column({ name: 'template_id', nullable: true })
  templateId: number | null

  @ManyToOne(() => ConsentTemplateEntity, { nullable: true })
  @JoinColumn({ name: 'template_id' })
  template: ConsentTemplateEntity | null

  @Column({ name: 'visit_id', nullable: true })
  visitId: number | null

  @ManyToOne(() => VisitEntity, { nullable: true })
  @JoinColumn({ name: 'visit_id' })
  visit: VisitEntity | null

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
  doctorId: number | null

  @ManyToOne(() => DoctorEntity, { nullable: true })
  @JoinColumn({ name: 'doctor_id' })
  doctor: DoctorEntity | null

  @Column({ length: 120 })
  title: string

  @Column({ length: 40 })
  category: string

  @Column({ length: 20, default: 'medium', name: 'risk_level' })
  riskLevel: string

  @Column({ type: 'text', name: 'content_snapshot' })
  contentSnapshot: string

  @Column({ type: 'json', nullable: true, name: 'template_snapshot' })
  templateSnapshot: Record<string, any> | null

  @Column({ type: 'json', nullable: true, name: 'customer_snapshot' })
  customerSnapshot: Record<string, any> | null

  @Column({ type: 'json', nullable: true, name: 'pet_snapshot' })
  petSnapshot: Record<string, any> | null

  @Column({ type: 'json', nullable: true, name: 'doctor_snapshot' })
  doctorSnapshot: Record<string, any> | null

  @Column({ type: 'tinyint', default: 1 })
  status: number

  @Column({ length: 50, nullable: true, name: 'guardian_name' })
  guardianName: string | null

  @Column({ length: 20, nullable: true, name: 'guardian_phone' })
  guardianPhone: string | null

  @Column({ type: 'datetime', nullable: true, name: 'signed_at' })
  signedAt: string | null

  @Column({ type: 'longtext', nullable: true, name: 'signature_data' })
  signatureData: string | null

  @Column({ nullable: true, name: 'operator_id' })
  operatorId: number | null

  @Column({ type: 'text', nullable: true })
  remark: string | null
}
