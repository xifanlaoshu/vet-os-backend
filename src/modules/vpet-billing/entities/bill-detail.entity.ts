import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'
import { BillingEntity } from './billing.entity'

@Entity('vpet_bill_detail')
export class BillDetailEntity extends CommonEntity {
  @Column({ name: 'billing_id', nullable: true })
  billingId: number

  @ManyToOne(() => BillingEntity, b => b.details)
  @JoinColumn({ name: 'billing_id' })
  billing: BillingEntity

  @Column({ type: 'tinyint', name: 'item_type' })
  itemType: number

  @Column({ length: 100, name: 'item_name' })
  itemName: string

  @Column({ nullable: true, name: 'item_id' })
  itemId: number

  @Column({ length: 30, nullable: true, name: 'source_type' })
  sourceType: string

  @Column({ nullable: true, name: 'source_id' })
  sourceId: number

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 1 })
  quantity: number

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0, name: 'unit_price' })
  unitPrice: number

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  amount: number

  @Column({ type: 'json', nullable: true, name: 'item_snapshot' })
  itemSnapshot: Record<string, any> | null

  @Column({ type: 'tinyint', default: 0, name: 'is_insurance' })
  isInsurance: number
}
