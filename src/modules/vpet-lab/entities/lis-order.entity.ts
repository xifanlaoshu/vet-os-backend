import { Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'
import { LabOrderEntity } from './lab-order.entity'

@Index('idx_vpet_lis_barcode', ['barcode'], { unique: true })
@Index('idx_vpet_lis_lab_order', ['labOrderId'], { unique: true })
@Entity('vpet_lis_order')
export class LisOrderEntity extends CommonEntity {
  @Column({ name: 'tenant_id', default: 1, comment: '租户 ID' })
  tenantId: number

  @Column({ name: 'area_id', default: 1, comment: '院区 ID' })
  areaId: number

  @Column({ name: 'lab_order_id', unique: true })
  labOrderId: number

  @OneToOne(() => LabOrderEntity, order => order.lisOrder)
  @JoinColumn({ name: 'lab_order_id' })
  labOrder: LabOrderEntity

  @Column({ length: 30, unique: true })
  barcode: string

  @Column({ length: 50, nullable: true, name: 'device_code' })
  deviceCode: string

  @Column({ type: 'tinyint', default: 1 })
  status: number

  @Column({ type: 'text', nullable: true, name: 'raw_response' })
  rawResponse: string

  @Column({ type: 'datetime', nullable: true, name: 'sent_at' })
  sentAt: string

  @Column({ type: 'datetime', nullable: true, name: 'received_at' })
  receivedAt: string
}
