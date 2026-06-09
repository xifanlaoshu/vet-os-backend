import { Column, Entity, Index } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'

@Index('idx_weight_pet', ['petId'])
@Entity('vpet_weight_record')
export class WeightRecordEntity extends CommonEntity {
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
