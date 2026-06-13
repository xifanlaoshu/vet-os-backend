import { ApiProperty, IntersectionType, PartialType } from '@nestjs/swagger'
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator'

import { OperatorDto } from '~/common/dto/operator.dto'
import { PagerDto } from '~/common/dto/pager.dto'
import { IsUnique } from '~/shared/database/constraints/unique.constraint'

import { RoleEntity } from './role.entity'

export class RoleDto extends OperatorDto {
  @ApiProperty({ description: 'Role name' })
  @IsUnique({ entity: RoleEntity, field: 'name', tenantScoped: true, message: 'Role name already exists in current tenant' })
  @IsString()
  @MinLength(2, { message: 'Role name must be at least 2 characters' })
  name: string

  @IsUnique({ entity: RoleEntity, tenantScoped: true, message: 'Role value already exists in current tenant' })
  @ApiProperty({ description: 'Role value' })
  @IsString()
  @Matches(/^[a-z0-9]+$/i, { message: 'Role value may contain only letters and numbers' })
  @MinLength(2, { message: 'Role value must be at least 2 characters' })
  value: string

  @ApiProperty({ description: 'Role remark' })
  @IsString()
  @IsOptional()
  remark?: string

  @ApiProperty({ description: 'Status' })
  @IsIn([0, 1])
  status: number

  @ApiProperty({ description: 'Menu and permission ids' })
  @IsOptional()
  @IsArray()
  menuIds?: number[]
}

export class RoleUpdateDto extends PartialType(RoleDto) {}

export class RoleQueryDto extends IntersectionType(PagerDto<RoleDto>, PartialType(RoleDto)) {
  @ApiProperty({ description: 'Role name', required: false })
  @IsString()
  name?: string

  @ApiProperty({ description: 'Role value', required: false })
  @IsString()
  value: string
}
