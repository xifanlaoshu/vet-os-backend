import { Column, Entity, Index, OneToMany } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'
import { DrugBatchEntity } from './drug-batch.entity'

@Index('idx_drug_code', ['drugCode'], { unique: true })
@Entity('vpet_drug')
export class DrugEntity extends CommonEntity {
  @Column({ length: 30, unique: true, name: 'drug_code' })
  drugCode: string

  @Column({ length: 100, name: 'drug_name' })
  drugName: string

  @Column({ length: 100, nullable: true, name: 'trade_name' })
  tradeName: string

  @Column({ type: 'tinyint', default: 1 })
  category: number

  @Column({ type: 'tinyint', default: 1, name: 'drug_type' })
  drugType: number

  @Column({ length: 100, nullable: true })
  specification: string

  @Column({ length: 20, default: '片' })
  unit: string

  @Column({ length: 20, nullable: true, name: 'dosage_unit' })
  dosageUnit: string | null

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 1, name: 'package_content_quantity' })
  packageContentQuantity: number

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0, name: 'retail_price' })
  retailPrice: number

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true, name: 'dosage_unit_price' })
  dosageUnitPrice: number | null

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 10, name: 'min_stock' })
  minStock: number

  @Column({ length: 100, nullable: true })
  supplier: string

  @Column({ length: 50, nullable: true, name: 'storage_condition' })
  storageCondition: string

  @Column({ type: 'tinyint', default: 1 })
  status: number

  @Column({ type: 'text', nullable: true })
  description: string

  @OneToMany(() => DrugBatchEntity, b => b.drug)
  batches: DrugBatchEntity[]
}
