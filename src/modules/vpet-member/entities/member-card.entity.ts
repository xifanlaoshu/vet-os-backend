import { Column, Entity, Index } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'

@Index('idx_member_customer', ['customerId'], { unique: true })
@Index('idx_member_card_no', ['cardNo'], { unique: true })
@Entity('vpet_member_card')
export class MemberCardEntity extends CommonEntity {
  @Column({ name: 'customer_id' })
  customerId: number

  @Column({ length: 30, unique: true, name: 'card_no' })
  cardNo: string

  @Column({ type: 'tinyint', default: 1 })
  level: number

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  balance: number

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'gift_balance' })
  giftBalance: number

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'total_recharge' })
  totalRecharge: number

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'total_spend' })
  totalSpend: number

  @Column({ default: 0 })
  points: number

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true, name: 'discount_rate_medical' })
  discountRateMedical: number

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true, name: 'discount_rate_retail' })
  discountRateRetail: number

  @Column({ type: 'tinyint', default: 1 })
  status: number
}
