import { Column, Entity, Index, OneToMany } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'
import { BillDetailEntity } from './bill-detail.entity'
import { BillingPaymentEntity } from './billing-payment.entity'

@Index('idx_billing_visit', ['visitId'])
@Index('idx_billing_customer', ['customerId'])
@Entity('vpet_billing')
export class BillingEntity extends CommonEntity {
  @Column({ name: 'tenant_id', default: 1, comment: '租户 ID' })
  tenantId: number

  @Column({ name: 'area_id', default: 1, comment: '院区 ID' })
  areaId: number

  @Column({ length: 30, unique: true, name: 'bill_no' })
  billNo: string

  @Column({ name: 'visit_id' })
  visitId: number

  @Column({ name: 'customer_id' })
  customerId: number

  @Column({ name: 'pet_id', nullable: true })
  petId: number | null

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'total_amount' })
  totalAmount: number

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount: number

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'paid_amount' })
  paidAmount: number

  @Column({ type: 'tinyint', nullable: true, name: 'payment_method' })
  paymentMethod: number

  @Column({ type: 'tinyint', default: 1, name: 'payment_status' })
  paymentStatus: number

  @Column({ nullable: true, name: 'cashier_id' })
  cashierId: number

  @Column({ type: 'datetime', nullable: true, name: 'paid_at' })
  paidAt: string

  @Column({ length: 30, nullable: true, name: 'invoice_no' })
  invoiceNo: string

  @Column({ length: 500, nullable: true })
  remark: string

  @Column({ type: 'json', nullable: true, name: 'customer_snapshot' })
  customerSnapshot: Record<string, any> | null

  @Column({ type: 'json', nullable: true, name: 'pet_snapshot' })
  petSnapshot: Record<string, any> | null

  @OneToMany(() => BillDetailEntity, d => d.billing, { cascade: true })
  details: BillDetailEntity[]

  @OneToMany(() => BillingPaymentEntity, payment => payment.billing, { cascade: false })
  payments: BillingPaymentEntity[]
}
