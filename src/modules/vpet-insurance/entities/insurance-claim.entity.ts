import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'
import { BillingEntity } from '~/modules/vpet-billing/entities/billing.entity'
import { CustomerEntity } from '~/modules/vpet-customer/entities/customer.entity'
import { PetEntity } from '~/modules/vpet-pet/entities/pet.entity'
import { VisitEntity } from '~/modules/vpet-visit/entities/visit.entity'

@Index('idx_vpet_claim_no', ['claimNo'], { unique: true })
@Entity('vpet_insurance_claim')
export class InsuranceClaimEntity extends CommonEntity {
  @Column({ name: 'tenant_id', default: 1, comment: '租户 ID' })
  tenantId: number

  @Column({ name: 'area_id', default: 1, comment: '院区 ID' })
  areaId: number

  @Column({ name: 'claim_no', length: 30, unique: true })
  claimNo: string

  @Column({ name: 'visit_id' })
  visitId: number

  @ManyToOne(() => VisitEntity)
  @JoinColumn({ name: 'visit_id' })
  visit: VisitEntity

  @Column({ name: 'billing_id', nullable: true })
  billingId: number

  @ManyToOne(() => BillingEntity, { nullable: true })
  @JoinColumn({ name: 'billing_id' })
  billing: BillingEntity

  @Column({ name: 'customer_id' })
  customerId: number

  @ManyToOne(() => CustomerEntity)
  @JoinColumn({ name: 'customer_id' })
  customer: CustomerEntity

  @Column({ name: 'pet_id' })
  petId: number

  @ManyToOne(() => PetEntity)
  @JoinColumn({ name: 'pet_id' })
  pet: PetEntity

  @Column({ length: 100, name: 'provider_name' })
  providerName: string

  @Column({ length: 50, nullable: true, name: 'policy_no' })
  policyNo: string

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'claim_amount' })
  claimAmount: number

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'approved_amount' })
  approvedAmount: number

  @Column({ type: 'tinyint', default: 1 })
  status: number

  @Column({ type: 'datetime', nullable: true, name: 'submitted_at' })
  submittedAt: string

  @Column({ type: 'datetime', nullable: true, name: 'settled_at' })
  settledAt: string

  @Column({ length: 255, nullable: true })
  remark: string

  @Column({ type: 'json', nullable: true, name: 'customer_snapshot' })
  customerSnapshot: Record<string, any>

  @Column({ type: 'json', nullable: true, name: 'pet_snapshot' })
  petSnapshot: Record<string, any>
}
