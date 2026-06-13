import { ApiProperty } from '@nestjs/swagger'
import { IsOptional, IsString, MinLength } from 'class-validator'

import { PagerDto } from '~/common/dto/pager.dto'
import { IsUnique } from '~/shared/database/constraints/unique.constraint'

import { ParamConfigEntity } from './param-config.entity'

export class ParamConfigDto {
  @ApiProperty({ description: 'Parameter name' })
  @IsString()
  name: string

  @ApiProperty({ description: 'Parameter key' })
  @IsUnique({ entity: ParamConfigEntity, tenantScoped: true, message: 'Parameter key already exists in current tenant' })
  @IsString()
  @MinLength(3)
  key: string

  @ApiProperty({ description: 'Parameter value' })
  @IsString()
  value: string

  @ApiProperty({ description: 'Remark' })
  @IsOptional()
  @IsString()
  remark?: string
}

export class ParamConfigQueryDto extends PagerDto {
  @ApiProperty({ description: 'Parameter name' })
  @IsString()
  @IsOptional()
  name: string
}
