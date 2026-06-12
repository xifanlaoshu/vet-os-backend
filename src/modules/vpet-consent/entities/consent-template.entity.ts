import { Column, Entity, Index } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'

@Index('idx_vpet_consent_template_code', ['code'], { unique: true })
@Index('idx_vpet_consent_template_category', ['category'])
@Index('idx_vpet_consent_template_active', ['isActive'])
@Entity('vpet_consent_template')
export class ConsentTemplateEntity extends CommonEntity {
  @Column({ name: 'tenant_id', default: 1, comment: '租户 ID' })
  tenantId: number

  @Column({ length: 50, unique: true })
  code: string

  @Column({ length: 120 })
  name: string

  @Column({ length: 40 })
  category: string

  @Column({ length: 30, nullable: true, name: 'species_scope' })
  speciesScope: string | null

  @Column({ length: 20, default: 'medium', name: 'risk_level' })
  riskLevel: string

  @Column({ type: 'text' })
  content: string

  @Column({ type: 'json', nullable: true })
  variables: Array<Record<string, any>> | null

  @Column({ type: 'text', nullable: true })
  description: string | null

  @Column({ type: 'tinyint', default: 1, name: 'is_active' })
  isActive: number
}
