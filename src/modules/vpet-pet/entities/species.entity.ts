import { Column, Entity, PrimaryColumn } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'

@Entity('vpet_species')
export class SpeciesEntity {
  @Column({ name: 'tenant_id', default: 1, comment: '租户 ID' })
  tenantId: number

  @PrimaryColumn({ length: 20 })
  code: string

  @Column({ length: 50 })
  name: string
}

@Entity('vpet_breed')
export class BreedEntity extends CommonEntity {
  @Column({ name: 'tenant_id', default: 1, comment: '租户 ID' })
  tenantId: number

  @Column({ length: 20, name: 'species_code' })
  speciesCode: string

  @Column({ length: 50 })
  name: string

  @Column({ nullable: true, type: 'text', name: 'health_risk' })
  healthRisk: string | null

  @Column({ nullable: true, type: 'tinyint', default: 0, name: 'is_rare' })
  isRare: number
}
