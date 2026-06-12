import { Column, Entity, Index } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'

@Index('idx_weight_pet', ['petId'])
@Entity('vpet_weight_record')
export class WeightRecordEntity extends CommonEntity {
  @Column({ name: 'tenant_id', default: 1, comment: '租户 ID' })
  tenantId: number

  @Column({ name: 'area_id', default: 1, comment: '院区 ID' })
  areaId: number

  @Column({ name: 'pet_id' })
  petId: number

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  weight: number

  @Column({ type: 'tinyint', nullable: true })
  bcs: number

  @Column({ type: 'datetime', name: 'recorded_at' })
  recordedAt: string

  @Column({ type: 'tinyint', default: 1 })
  source: number
}
