import { ApiProperty } from '@nestjs/swagger'
import { Column, Entity, Index } from 'typeorm'

import { CompleteEntity } from '~/common/entity/common.entity'

@Entity({ name: 'sys_tenant' })
export class TenantEntity extends CompleteEntity {
  @ApiProperty({ description: '租户编码' })
  @Index('uk_sys_tenant_code', { unique: true })
  @Column({ length: 64 })
  code: string

  @ApiProperty({ description: '租户名称' })
  @Column({ length: 120 })
  name: string

  @ApiProperty({ description: '租户简称' })
  @Column({ name: 'short_name', length: 80, nullable: true })
  shortName: string

  @ApiProperty({ description: '联系人' })
  @Column({ name: 'contact_name', length: 80, nullable: true })
  contactName: string

  @ApiProperty({ description: '联系电话' })
  @Column({ name: 'contact_phone', length: 30, nullable: true })
  contactPhone: string

  @ApiProperty({ description: '地区' })
  @Column({ length: 120, nullable: true })
  region: string

  @ApiProperty({ description: '地址' })
  @Column({ length: 255, nullable: true })
  address: string

  @ApiProperty({ description: '套餐/版本' })
  @Column({ length: 40, nullable: true })
  edition: string

  @ApiProperty({ description: '状态' })
  @Column({ type: 'tinyint', default: 1 })
  status: number

  @ApiProperty({ description: '备注' })
  @Column({ length: 500, nullable: true })
  remark: string
}
