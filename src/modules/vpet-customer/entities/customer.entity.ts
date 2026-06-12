import { Column, Entity, Index } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'

@Index('idx_customer_phone', ['phone'])
@Index('idx_customer_wechat', ['wechatOpenid'])
@Entity('vpet_customer')
export class CustomerEntity extends CommonEntity {
  @Column({ name: 'tenant_id', default: 1, comment: '租户 ID' })
  tenantId: number

  @Column({ name: 'home_area_id', nullable: true, comment: '常用院区 ID' })
  homeAreaId: number | null

  @Column({ length: 50 })
  name: string

  @Column({ length: 20, unique: true })
  phone: string

  @Column({ length: 64, nullable: true, name: 'wechat_openid' })
  wechatOpenid: string

  @Column({ length: 64, nullable: true, name: 'wechat_unionid' })
  wechatUnionid: string

  @Column({ type: 'tinyint', default: 0 })
  gender: number

  @Column({ type: 'date', nullable: true })
  birthday: string

  @Column({ length: 200, nullable: true })
  address: string

  @Column({ length: 18, nullable: true, name: 'id_card' })
  idCard: string

  @Column({ type: 'tinyint', default: 4 })
  source: number

  @Column({ length: 500, nullable: true })
  tags: string

  @Column({ length: 500, nullable: true })
  remark: string

  @Column({ type: 'tinyint', default: 1 })
  status: number
}
