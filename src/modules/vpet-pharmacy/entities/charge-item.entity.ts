import { Column, Entity, Index } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'

@Index('idx_charge_item_code', ['itemCode'], { unique: true })
@Index('idx_charge_item_category', ['category'])
@Entity('vpet_charge_item')
export class ChargeItemEntity extends CommonEntity {
  @Column({ length: 30, unique: true, name: 'item_code' })
  itemCode: string

  @Column({ length: 100, name: 'item_name' })
  itemName: string

  @Column({ length: 50, nullable: true })
  category: string | null

  @Column({ length: 100, nullable: true })
  specification: string | null

  @Column({ length: 20, default: '项' })
  unit: string

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0, name: 'retail_price' })
  retailPrice: number

  @Column({ type: 'tinyint', default: 1 })
  status: number

  @Column({ type: 'text', nullable: true })
  description: string | null
}
