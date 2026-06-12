import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'
import { PrescriptionEntity } from './prescription.entity'

@Entity('vpet_rx_detail')
export class RxDetailEntity extends CommonEntity {
  @Column({ name: 'tenant_id', default: 1, comment: '租户 ID' })
  tenantId: number

  @Column({ name: 'area_id', default: 1, comment: '院区 ID' })
  areaId: number

  @Column({ name: 'prescription_id', nullable: true })
  prescriptionId: number

  @Column({ type: 'tinyint', default: 1, name: 'item_kind' })
  itemKind: number

  @Column({ nullable: true, name: 'item_id' })
  itemId: number | null

  @Column({ length: 100, nullable: true, name: 'item_name' })
  itemName: string | null

  @ManyToOne(() => PrescriptionEntity, p => p.details)
  @JoinColumn({ name: 'prescription_id' })
  prescription: PrescriptionEntity

  @Column({ nullable: true, name: 'drug_id' })
  drugId: number | null

  @Column({ nullable: true, name: 'charge_item_id' })
  chargeItemId: number | null

  @Column({ length: 100, name: 'drug_name' })
  drugName: string

  @Column({ length: 100, nullable: true })
  specification: string

  @Column({ length: 50, nullable: true })
  dosage: string

  @Column({ length: 20, nullable: true, name: 'dosage_unit' })
  dosageUnit: string

  @Column({ length: 30, nullable: true })
  frequency: string

  @Column({ length: 30, nullable: true })
  route: string

  @Column({ nullable: true })
  duration: number

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  quantity: number

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0, name: 'unit_price' })
  unitPrice: number

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  amount: number

  @Column({ length: 200, nullable: true })
  remark: string
}
