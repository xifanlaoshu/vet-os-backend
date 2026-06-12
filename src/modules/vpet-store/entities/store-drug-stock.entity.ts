import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'
import { DrugEntity } from '~/modules/vpet-pharmacy/entities/drug.entity'
import { StoreEntity } from './store.entity'

@Index('idx_vpet_store_stock_unique', ['storeId', 'drugId'], { unique: true })
@Entity('vpet_store_drug_stock')
export class StoreDrugStockEntity extends CommonEntity {
  @Column({ name: 'tenant_id', default: 1, comment: '租户 ID' })
  tenantId: number

  @Column({ name: 'area_id', default: 1, comment: '院区 ID' })
  areaId: number

  @Column({ name: 'store_id' })
  storeId: number

  @ManyToOne(() => StoreEntity)
  @JoinColumn({ name: 'store_id' })
  store: StoreEntity

  @Column({ name: 'drug_id' })
  drugId: number

  @ManyToOne(() => DrugEntity)
  @JoinColumn({ name: 'drug_id' })
  drug: DrugEntity

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  quantity: number

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'safety_stock' })
  safetyStock: number
}
