import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'
import { LabOrderEntity } from './lab-order.entity'

@Entity('vpet_lab_result_item')
export class LabResultItemEntity extends CommonEntity {
  @Column({ name: 'tenant_id', default: 1, comment: '租户 ID' })
  tenantId: number

  @Column({ name: 'area_id', default: 1, comment: '院区 ID' })
  areaId: number

  @Column({ name: 'lab_order_id' })
  labOrderId: number

  @ManyToOne(() => LabOrderEntity, order => order.resultItems)
  @JoinColumn({ name: 'lab_order_id' })
  labOrder: LabOrderEntity

  @Column({ length: 50, nullable: true, name: 'item_code' })
  itemCode: string

  @Column({ length: 100, name: 'item_name' })
  itemName: string

  @Column({ length: 50, nullable: true, name: 'result_value' })
  resultValue: string

  @Column({ length: 20, nullable: true })
  unit: string

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'ref_min' })
  refMin: number

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'ref_max' })
  refMax: number

  @Column({ length: 5, nullable: true })
  flag: string

  @Column({ type: 'int', default: 0, name: 'display_order' })
  displayOrder: number
}
