import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'
import { BillingEntity } from './billing.entity'

@Index('idx_billing_payment_bill', ['billingId'])
@Index('idx_billing_payment_paid_at', ['paidAt'])
@Entity('vpet_billing_payment')
export class BillingPaymentEntity extends CommonEntity {
  @Column({ name: 'billing_id' })
  billingId: number

  @ManyToOne(() => BillingEntity, billing => billing.payments)
  @JoinColumn({ name: 'billing_id' })
  billing: BillingEntity

  @Column({ type: 'tinyint', name: 'payment_method' })
  paymentMethod: number

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number

  @Column({ type: 'tinyint', default: 1 })
  direction: number

  @Column({ length: 64, nullable: true, name: 'trade_no' })
  tradeNo: string

  @Column({ nullable: true, name: 'operator_id' })
  operatorId: number

  @Column({ type: 'datetime', name: 'paid_at' })
  paidAt: string

  @Column({ type: 'tinyint', default: 1 })
  status: number

  @Column({ length: 200, nullable: true })
  remark: string
}
