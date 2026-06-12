import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'
import { DoctorEntity } from '~/modules/vpet-appointment/entities/doctor.entity'
import { RxDetailEntity } from './rx-detail.entity'

@Index('idx_rx_visit', ['visitId'])
@Index('idx_rx_batch', ['visitId', 'batchNo'])
@Entity('vpet_prescription')
export class PrescriptionEntity extends CommonEntity {
  @Column({ name: 'tenant_id', default: 1, comment: '租户 ID' })
  tenantId: number

  @Column({ name: 'area_id', default: 1, comment: '院区 ID' })
  areaId: number

  @Column({ length: 30, unique: true, name: 'rx_no' })
  rxNo: string

  @Column({ name: 'visit_id' })
  visitId: number

  @Column({ name: 'customer_id', nullable: true })
  customerId: number | null

  @Column({ name: 'pet_id', nullable: true })
  petId: number | null

  @Column({ name: 'hospitalization_id', nullable: true })
  hospitalizationId: number | null

  @Column({ type: 'tinyint', default: 1 })
  type: number

  @Column({ type: 'tinyint', default: 1 })
  status: number

  @Column({ name: 'doctor_id' })
  doctorId: number

  @ManyToOne(() => DoctorEntity)
  @JoinColumn({ name: 'doctor_id' })
  doctor: DoctorEntity

  @Column({ nullable: true, name: 'pharmacist_id' })
  pharmacistId: number

  @ManyToOne(() => DoctorEntity, { nullable: true })
  @JoinColumn({ name: 'pharmacist_id' })
  pharmacist: DoctorEntity | null

  @Column({ length: 30, nullable: true, name: 'batch_no' })
  batchNo: string | null

  @Column({ length: 100, nullable: true, name: 'batch_label' })
  batchLabel: string | null

  @Column({ length: 30, nullable: true, name: 'source_type' })
  sourceType: string | null

  @Column({ nullable: true, name: 'source_id' })
  sourceId: number | null

  @Column({ length: 200, nullable: true, name: 'diagnosis_summary' })
  diagnosisSummary: string

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'total_amount' })
  totalAmount: number

  @Column({ type: 'datetime', nullable: true, name: 'reviewed_at' })
  reviewedAt: string

  @Column({ type: 'datetime', nullable: true, name: 'dispensed_at' })
  dispensedAt: string

  @Column({ type: 'json', nullable: true, name: 'customer_snapshot' })
  customerSnapshot: Record<string, any> | null

  @Column({ type: 'json', nullable: true, name: 'pet_snapshot' })
  petSnapshot: Record<string, any> | null

  @Column({ type: 'json', nullable: true, name: 'doctor_snapshot' })
  doctorSnapshot: Record<string, any> | null

  @OneToMany(() => RxDetailEntity, d => d.prescription, { cascade: true })
  details: RxDetailEntity[]
}
