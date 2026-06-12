import { Column, Entity, Index } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'

@Index('idx_vpet_operation_audit_biz', ['bizType', 'bizId'])
@Index('idx_vpet_operation_audit_action', ['action'])
@Entity('vpet_operation_audit_log')
export class OperationAuditLogEntity extends CommonEntity {
  @Column({ name: 'tenant_id', default: 1, comment: '绉熸埛 ID' })
  tenantId: number

  @Column({ name: 'area_id', default: 1, comment: '闄㈠尯 ID' })
  areaId: number

  @Column({ length: 40, name: 'biz_type' })
  bizType: string

  @Column({ name: 'biz_id' })
  bizId: number

  @Column({ length: 40 })
  action: string

  @Column({ type: 'json', nullable: true, name: 'before_snapshot' })
  beforeSnapshot: Record<string, any> | null

  @Column({ type: 'json', nullable: true, name: 'after_snapshot' })
  afterSnapshot: Record<string, any> | null

  @Column({ length: 500, nullable: true })
  reason: string

  @Column({ nullable: true, name: 'operator_id' })
  operatorId: number
}
