import { ApiProperty } from '@nestjs/swagger'
import { Column, Entity } from 'typeorm'

import { CommonEntity } from '~/common/entity/common.entity'

@Entity({ name: 'sys_config' })
export class ParamConfigEntity extends CommonEntity {
  @Column({ name: 'tenant_id', default: 1, comment: '租户 ID' })
  tenantId: number

  @Column({ type: 'varchar', length: 50 })
  @ApiProperty({ description: '配置名' })
  name: string

  @Column({ type: 'varchar', length: 50, unique: true })
  @ApiProperty({ description: '配置键名' })
  key: string

  @Column({ type: 'varchar', nullable: true })
  @ApiProperty({ description: '配置值' })
  value: string

  @Column({ type: 'varchar', nullable: true })
  @ApiProperty({ description: '配置描述' })
  remark: string
}
