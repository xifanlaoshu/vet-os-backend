import { Column, Entity, Index } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'

@Index('idx_vpet_ai_log_biz', ['bizType', 'bizId'])
@Entity('vpet_ai_log')
export class AiLogEntity extends CommonEntity {
  @Column({ name: 'tenant_id', default: 1, comment: '租户 ID' })
  tenantId: number

  @Column({ name: 'area_id', default: 1, comment: '院区 ID' })
  areaId: number

  @Column({ length: 50, name: 'task_type' })
  taskType: string

  @Column({ length: 50, nullable: true, name: 'biz_type' })
  bizType: string

  @Column({ nullable: true, name: 'biz_id' })
  bizId: number

  @Column({ type: 'tinyint', default: 1, name: 'risk_level' })
  riskLevel: number

  @Column({ type: 'tinyint', default: 1 })
  status: number

  @Column({ type: 'json', nullable: true, name: 'request_payload' })
  requestPayload: Record<string, any>

  @Column({ type: 'json', nullable: true, name: 'response_payload' })
  responsePayload: Record<string, any>

  @Column({ type: 'json', nullable: true })
  warnings: Record<string, any>[]
}
