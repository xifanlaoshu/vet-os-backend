import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'
import { DrugTransferItemEntity } from './drug-transfer-item.entity'
import { StoreEntity } from './store.entity'

@Index('idx_vpet_transfer_no', ['transferNo'], { unique: true })
@Entity('vpet_drug_transfer')
export class DrugTransferEntity extends CommonEntity {
  @Column({ name: 'transfer_no', length: 30, unique: true })
  transferNo: string

  @Column({ name: 'source_store_id' })
  sourceStoreId: number

  @ManyToOne(() => StoreEntity)
  @JoinColumn({ name: 'source_store_id' })
  sourceStore: StoreEntity

  @Column({ name: 'target_store_id' })
  targetStoreId: number

  @ManyToOne(() => StoreEntity)
  @JoinColumn({ name: 'target_store_id' })
  targetStore: StoreEntity

  @Column({ type: 'tinyint', default: 1 })
  status: number

  @Column({ length: 200, nullable: true })
  reason: string

  @Column({ nullable: true, name: 'requested_by' })
  requestedBy: number

  @Column({ nullable: true, name: 'approved_by' })
  approvedBy: number

  @Column({ type: 'datetime', nullable: true, name: 'requested_at' })
  requestedAt: string

  @Column({ type: 'datetime', nullable: true, name: 'approved_at' })
  approvedAt: string

  @Column({ type: 'datetime', nullable: true, name: 'completed_at' })
  completedAt: string

  @OneToMany(() => DrugTransferItemEntity, item => item.transfer, { cascade: true })
  items: DrugTransferItemEntity[]
}
