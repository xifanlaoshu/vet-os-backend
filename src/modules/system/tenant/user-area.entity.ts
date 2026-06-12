import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

@Entity({ name: 'sys_user_areas' })
@Index('uk_sys_user_area', ['userId', 'tenantId', 'areaId'], { unique: true })
export class UserAreaEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Index('idx_sys_user_areas_user')
  @Column({ name: 'user_id' })
  userId: number

  @Index('idx_sys_user_areas_tenant')
  @Column({ name: 'tenant_id' })
  tenantId: number

  @Index('idx_sys_user_areas_area')
  @Column({ name: 'area_id' })
  areaId: number

  @Column({ name: 'default_area', type: 'tinyint', default: 0 })
  defaultArea: number
}
