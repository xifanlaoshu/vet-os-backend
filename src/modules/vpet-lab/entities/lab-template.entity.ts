import { Column, Entity, Index } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'

@Index('idx_vpet_lab_template_code', ['code'], { unique: true })
@Index('idx_vpet_lab_template_active', ['isActive'])
@Entity('vpet_lab_template')
export class LabTemplateEntity extends CommonEntity {
  @Column({ length: 50, unique: true })
  code: string

  @Column({ length: 100 })
  name: string

  @Column({ type: 'tinyint', default: 1 })
  category: number

  @Column({ length: 30, nullable: true, name: 'species_scope' })
  speciesScope: string | null

  @Column({ length: 50, nullable: true, name: 'sample_type' })
  sampleType: string | null

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'default_charge_amount' })
  defaultChargeAmount: number

  @Column({ type: 'json', nullable: true, name: 'result_schema' })
  resultSchema: Record<string, any> | null

  @Column({ type: 'text', nullable: true, name: 'template_header' })
  templateHeader: string | null

  @Column({ type: 'text', nullable: true, name: 'template_footer' })
  templateFooter: string | null

  @Column({ type: 'text', nullable: true })
  description: string | null

  @Column({ type: 'tinyint', default: 1, name: 'is_active' })
  isActive: number
}
