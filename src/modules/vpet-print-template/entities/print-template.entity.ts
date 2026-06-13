import { Column, Entity, Index } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'

@Index('idx_vpet_print_template_type', ['tenantId', 'areaId', 'templateType'])
@Index('idx_vpet_print_template_code', ['tenantId', 'code'], { unique: true })
@Entity('vpet_print_template')
export class PrintTemplateEntity extends CommonEntity {
  @Column({ name: 'tenant_id', default: 1, comment: '租户 ID' })
  tenantId: number

  @Column({ name: 'area_id', nullable: true, comment: '院区 ID，空表示租户通用模板' })
  areaId: number | null

  @Column({ length: 60 })
  code: string

  @Column({ length: 120 })
  name: string

  @Column({ length: 40, name: 'template_type' })
  templateType: string

  @Column({ length: 30, default: 'a4', name: 'paper_type' })
  paperType: string

  @Column({ type: 'tinyint', default: 0, name: 'default_template' })
  defaultTemplate: number

  @Column({ type: 'text', nullable: true, name: 'template_header' })
  templateHeader: string | null

  @Column({ type: 'text', name: 'template_body' })
  templateBody: string

  @Column({ type: 'text', nullable: true, name: 'template_footer' })
  templateFooter: string | null

  @Column({ type: 'json', nullable: true, name: 'style_config' })
  styleConfig: Record<string, any> | null

  @Column({ type: 'json', nullable: true, name: 'variable_schema' })
  variableSchema: Record<string, any> | null

  @Column({ type: 'tinyint', default: 1 })
  status: number

  @Column({ length: 500, nullable: true })
  remark: string | null
}
