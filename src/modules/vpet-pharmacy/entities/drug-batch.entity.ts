import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'
import { DrugEntity } from './drug.entity'

@Index('idx_batch_expire', ['expireDate'])
@Index('idx_batch_drug', ['drugId'])
@Entity('vpet_drug_batch')
export class DrugBatchEntity extends CommonEntity {
  @Column({ name: 'tenant_id', default: 1, comment: '租户 ID' })
  tenantId: number

  @Column({ name: 'area_id', default: 1, comment: '院区 ID' })
  areaId: number

  @Column({ name: 'drug_id' })
  drugId: number

  @ManyToOne(() => DrugEntity, d => d.batches)
  @JoinColumn({ name: 'drug_id' })
  drug: DrugEntity

  @Column({ length: 50, nullable: true, name: 'batch_no' })
  batchNo: string

  @Column({ type: 'date', nullable: true, name: 'expire_date' })
  expireDate: string

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0, name: 'purchase_price' })
  purchasePrice: number

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  quantity: number

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'initial_quantity' })
  initialQuantity: number

  @Column({ type: 'tinyint', default: 1 })
  status: number
}
