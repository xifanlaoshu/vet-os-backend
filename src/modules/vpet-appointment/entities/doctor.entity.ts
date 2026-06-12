import { Column, Entity, Index, VirtualColumn } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'

@Index('idx_doctor_user', ['userId'], { unique: true })
@Entity('vpet_doctor')
export class DoctorEntity extends CommonEntity {
  @Column({ name: 'tenant_id', default: 1, comment: '租户 ID' })
  tenantId: number

  @Column({ nullable: true })
  userId: number | null

  @VirtualColumn({
    query: alias => `SELECT COALESCE(u.nickname, u.username) FROM sys_user u WHERE u.id = ${alias}.userId`,
  })
  userNickname: string | null

  @Column({ length: 50 })
  name: string

  @Column({ length: 20, nullable: true })
  phone: string

  @Column({ length: 50, nullable: true })
  title: string

  @Column({ length: 32, default: 'doctor' })
  position: string

  @Column({ length: 50, nullable: true })
  department: string

  @Column({ type: 'text', nullable: true })
  introduction: string

  @Column({ type: 'tinyint', default: 1 })
  bookable: number

  @Column({ type: 'tinyint', default: 1 })
  status: number
}
