import { ApiProperty } from '@nestjs/swagger'
import { Column, Entity, Index } from 'typeorm'

import { CompleteEntity } from '~/common/entity/common.entity'

@Entity({ name: 'sys_tenant_area' })
@Index('uk_sys_tenant_area_code', ['tenantId', 'code'], { unique: true })
export class TenantAreaEntity extends CompleteEntity {
  @ApiProperty({ description: '租户 ID' })
  @Index('idx_sys_tenant_area_tenant')
  @Column({ name: 'tenant_id' })
  tenantId: number

  @ApiProperty({ description: '院区编码' })
  @Column({ length: 64 })
  code: string

  @ApiProperty({ description: '院区名称' })
  @Column({ length: 120 })
  name: string

  @ApiProperty({ description: '院区简称' })
  @Column({ name: 'short_name', length: 80, nullable: true })
  shortName: string

  @ApiProperty({ description: '联系电话' })
  @Column({ name: 'contact_phone', length: 30, nullable: true })
  contactPhone: string

  @ApiProperty({ description: '地区' })
  @Column({ length: 120, nullable: true })
  region: string

  @ApiProperty({ description: '地址' })
  @Column({ length: 255, nullable: true })
  address: string

  @ApiProperty({ description: '营业时间配置' })
  @Column({ name: 'business_hours', type: 'json', nullable: true })
  businessHours: Record<string, any>

  @ApiProperty({ description: '是否默认院区' })
  @Column({ name: 'default_area', type: 'tinyint', default: 0 })
  defaultArea: number

  @ApiProperty({ description: '状态' })
  @Column({ type: 'tinyint', default: 1 })
  status: number

  @ApiProperty({ description: '排序' })
  @Column({ name: 'sort_no', type: 'int', default: 0 })
  sortNo: number

  @ApiProperty({ description: '备注' })
  @Column({ length: 500, nullable: true })
  remark: string
}
