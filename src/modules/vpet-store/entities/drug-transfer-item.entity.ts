import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'
import { DrugEntity } from '~/modules/vpet-pharmacy/entities/drug.entity'
import { DrugTransferEntity } from './drug-transfer.entity'

@Entity('vpet_drug_transfer_item')
export class DrugTransferItemEntity extends CommonEntity {
  @Column({ name: 'tenant_id', default: 1, comment: '租户 ID' })
  tenantId: number

  @Column({ name: 'area_id', default: 1, comment: '院区 ID' })
  areaId: number

  @Column({ name: 'transfer_id' })
  transferId: number

  @ManyToOne(() => DrugTransferEntity, transfer => transfer.items)
  @JoinColumn({ name: 'transfer_id' })
  transfer: DrugTransferEntity

  @Column({ name: 'drug_id' })
  drugId: number

  @ManyToOne(() => DrugEntity)
  @JoinColumn({ name: 'drug_id' })
  drug: DrugEntity

  @Column({ name: 'drug_name', length: 100 })
  drugName: string

  @Column({ length: 100, nullable: true })
  specification: string

  @Column({ length: 20, nullable: true })
  unit: string

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: number

  @Column({ type: 'json', nullable: true })
  snapshot: Record<string, any>
}
