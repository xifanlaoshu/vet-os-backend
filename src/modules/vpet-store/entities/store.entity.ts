import { Column, Entity, Index } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'

@Index('idx_vpet_store_code', ['storeCode'], { unique: true })
@Entity('vpet_store')
export class StoreEntity extends CommonEntity {
  @Column({ name: 'store_code', length: 30, unique: true })
  storeCode: string

  @Column({ name: 'store_name', length: 100 })
  storeName: string

  @Column({ length: 50, nullable: true, name: 'contact_name' })
  contactName: string

  @Column({ length: 30, nullable: true, name: 'contact_phone' })
  contactPhone: string

  @Column({ length: 200, nullable: true })
  address: string

  @Column({ type: 'tinyint', default: 1 })
  status: number
}
