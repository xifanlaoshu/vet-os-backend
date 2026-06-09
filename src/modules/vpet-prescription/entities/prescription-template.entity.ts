import { Column, Entity, Index, OneToMany } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'
import { PrescriptionTemplateItemEntity } from './prescription-template-item.entity'

@Index('idx_rx_template_code', ['templateCode'], { unique: true })
@Index('idx_rx_template_status', ['status'])
@Entity('vpet_prescription_template')
export class PrescriptionTemplateEntity extends CommonEntity {
  @Column({ length: 50, name: 'template_code' })
  templateCode: string

  @Column({ length: 100, name: 'template_name' })
  templateName: string

  @Column({ length: 50, nullable: true })
  category: string | null

  @Column({ length: 50, nullable: true, name: 'species_scope' })
  speciesScope: string | null

  @Column({ type: 'tinyint', default: 1 })
  status: number

  @Column({ length: 500, nullable: true })
  description: string | null

  @OneToMany(() => PrescriptionTemplateItemEntity, item => item.template, { cascade: true })
  items: PrescriptionTemplateItemEntity[]
}
