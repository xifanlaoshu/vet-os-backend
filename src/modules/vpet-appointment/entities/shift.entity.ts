import { Column, Entity, Index } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'

@Index('idx_vpet_shift_code', ['code'], { unique: true })
@Index('idx_vpet_shift_status', ['status'])
@Entity('vpet_shift')
export class ShiftEntity extends CommonEntity {
  @Column({ length: 40 })
  code: string

  @Column({ length: 80 })
  name: string

  @Column({ type: 'time' })
  startTime: string

  @Column({ type: 'time' })
  endTime: string

  @Column({ length: 20, default: '#1677ff' })
  color: string

  @Column({ type: 'tinyint', default: 1 })
  status: number

  @Column({ length: 200, nullable: true })
  remark: string
}
