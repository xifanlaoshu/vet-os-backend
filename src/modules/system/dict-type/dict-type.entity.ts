import { ApiProperty } from '@nestjs/swagger'
import { Column, Entity, Index } from 'typeorm'

import { CompleteEntity } from '~/common/entity/common.entity'

@Entity({ name: 'sys_dict_type' })
@Index('uk_sys_dict_type_tenant_name', ['tenantId', 'name'], { unique: true })
@Index('uk_sys_dict_type_tenant_code', ['tenantId', 'code'], { unique: true })
export class DictTypeEntity extends CompleteEntity {
  @Column({ name: 'tenant_id', default: 1, comment: '租户 ID' })
  tenantId: number

  @Column({ type: 'varchar', length: 50 })
  @ApiProperty({ description: '字典名称' })
  name: string

  @Column({ type: 'varchar', length: 50 })
  @ApiProperty({ description: '字典编码' })
  code: string

  @Column({ type: 'tinyint', default: 1 })
  @ApiProperty({ description: ' 状态' })
  status: number

  @Column({ type: 'varchar', nullable: true })
  @ApiProperty({ description: '备注' })
  remark: string
}
