import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'
import { PrescriptionTemplateEntity } from './prescription-template.entity'

@Entity('vpet_prescription_template_item')
export class PrescriptionTemplateItemEntity extends CommonEntity {
  @Column({ name: 'tenant_id', default: 1, comment: '租户 ID' })
  tenantId: number

  @Column({ name: 'template_id' })
  templateId: number

  @ManyToOne(() => PrescriptionTemplateEntity, template => template.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template: PrescriptionTemplateEntity

  @Column({ nullable: true, name: 'drug_id' })
  drugId: number | null

  @Column({ type: 'tinyint', default: 1, name: 'item_kind' })
  itemKind: number

  @Column({ nullable: true, name: 'item_id' })
  itemId: number | null

  @Column({ length: 100, nullable: true, name: 'item_name' })
  itemName: string | null

  @Column({ nullable: true, name: 'charge_item_id' })
  chargeItemId: number | null

  @Column({ length: 100, name: 'drug_name' })
  drugName: string

  @Column({ length: 100, nullable: true })
  specification: string | null

  @Column({ length: 50, nullable: true })
  dosage: string | null

  @Column({ length: 300, nullable: true, name: 'dosage_formula' })
  dosageFormula: string | null

  @Column({ length: 20, nullable: true, name: 'dosage_unit' })
  dosageUnit: string | null

  @Column({ length: 30, nullable: true })
  frequency: string | null

  @Column({ length: 30, nullable: true })
  route: string | null

  @Column({ nullable: true })
  duration: number | null

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 1 })
  quantity: number

  @Column({ length: 300, nullable: true, name: 'quantity_formula' })
  quantityFormula: string | null

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0, name: 'unit_price' })
  unitPrice: number

  @Column({ length: 200, nullable: true })
  remark: string | null

  @Column({ default: 0, name: 'sort_no' })
  sortNo: number
}
