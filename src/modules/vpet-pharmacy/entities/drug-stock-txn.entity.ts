import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'
import { DoctorEntity } from '~/modules/vpet-appointment/entities/doctor.entity'
import { DrugBatchEntity } from './drug-batch.entity'
import { DrugEntity } from './drug.entity'

@Index('idx_drug_stock_txn_drug', ['drugId'])
@Index('idx_drug_stock_txn_time', ['txnTime'])
@Entity('vpet_drug_stock_txn')
export class DrugStockTxnEntity extends CommonEntity {
  @Column({ name: 'tenant_id', default: 1, comment: '租户 ID' })
  tenantId: number

  @Column({ name: 'area_id', default: 1, comment: '院区 ID' })
  areaId: number

  @Column({ name: 'drug_id' })
  drugId: number

  @ManyToOne(() => DrugEntity)
  @JoinColumn({ name: 'drug_id' })
  drug: DrugEntity

  @Column({ nullable: true, name: 'batch_id' })
  batchId: number

  @ManyToOne(() => DrugBatchEntity, { nullable: true })
  @JoinColumn({ name: 'batch_id' })
  batch: DrugBatchEntity

  @Column({ type: 'tinyint', name: 'txn_type' })
  txnType: number

  @Column({ length: 50, nullable: true, name: 'ref_type' })
  refType: string

  @Column({ nullable: true, name: 'ref_id' })
  refId: number

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'quantity_before' })
  quantityBefore: number

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'quantity_change' })
  quantityChange: number

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'quantity_after' })
  quantityAfter: number

  @Column({ nullable: true, name: 'operator_id' })
  operatorId: number

  @ManyToOne(() => DoctorEntity, { nullable: true })
  @JoinColumn({ name: 'operator_id' })
  operator: DoctorEntity | null

  @Column({ type: 'datetime', name: 'txn_time' })
  txnTime: string
}
