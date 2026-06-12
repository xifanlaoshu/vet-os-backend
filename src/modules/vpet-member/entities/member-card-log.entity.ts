import { Column, Entity, Index } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'

@Index('idx_card_log_card', ['cardId'])
@Entity('vpet_member_card_log')
export class MemberCardLogEntity extends CommonEntity {
  @Column({ name: 'tenant_id', default: 1, comment: '租户 ID' })
  tenantId: number

  @Column({ name: 'area_id', default: 1, comment: '院区 ID' })
  areaId: number

  @Column({ name: 'card_id' })
  cardId: number

  @Column({ type: 'tinyint' })
  type: number

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number

  @Column({ type: 'tinyint' })
  direction: number

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'balance_before' })
  balanceBefore: number

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'balance_after' })
  balanceAfter: number

  @Column({ nullable: true, name: 'operator_id' })
  operatorId: number

  @Column({ nullable: true, name: 'billing_id' })
  billingId: number

  @Column({ length: 250, nullable: true })
  remark: string
}
