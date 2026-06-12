import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'
import { CustomerEntity } from '~/modules/vpet-customer/entities/customer.entity'

@Index('idx_pet_customer', ['customerId'])
@Entity('vpet_pet')
export class PetEntity extends CommonEntity {
  @Column({ name: 'tenant_id', default: 1, comment: '租户 ID' })
  tenantId: number

  @Column({ name: 'home_area_id', nullable: true, comment: '常用院区 ID' })
  homeAreaId: number | null

  @Column({ name: 'customer_id' })
  customerId: number

  @ManyToOne(() => CustomerEntity)
  @JoinColumn({ name: 'customer_id' })
  customer: CustomerEntity

  @Column({ length: 50 })
  name: string

  @Column({ length: 20 })
  species: string

  @Column({ length: 50 })
  breed: string

  @Column({ type: 'tinyint' })
  gender: number

  @Column({ type: 'tinyint', default: 0 })
  neutered: number

  @Column({ type: 'date', nullable: true })
  birthday: string

  @Column({ length: 30, nullable: true })
  color: string

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  weight: number

  @Column({ length: 50, nullable: true, name: 'microchip_id' })
  microchipId: string

  @Column({ length: 500, nullable: true })
  photo: string

  @Column({ length: 500, nullable: true })
  allergy: string

  @Column({ type: 'text', nullable: true, name: 'medical_history' })
  medicalHistory: string

  @Column({ length: 100, nullable: true, name: 'behavior_tag' })
  behaviorTag: string

  @Column({ type: 'tinyint', nullable: true, name: 'life_stage' })
  lifeStage: number

  @Column({ length: 100, nullable: true, name: 'diet_brand' })
  dietBrand: string

  @Column({ type: 'tinyint', nullable: true, name: 'living_environment' })
  livingEnvironment: number

  @Column({ type: 'tinyint', nullable: true, name: 'other_pets_count' })
  otherPetsCount: number

  @Column({ length: 200, nullable: true, name: 'recent_travel' })
  recentTravel: string

  @Column({ type: 'tinyint', nullable: true, name: 'reproductive_status' })
  reproductiveStatus: number

  @Column({ type: 'tinyint', default: 1 })
  status: number
}
