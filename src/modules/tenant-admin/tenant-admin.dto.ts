import { PartialType } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator'
import { PagerDto } from '~/common/dto/pager.dto'

export class TenantAdminAreaQueryDto extends PagerDto {
  @IsOptional()
  @IsString()
  keyword?: string

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  status?: number
}

export class TenantAdminAreaDto {
  @IsString()
  @MaxLength(64)
  code: string

  @IsString()
  @MaxLength(120)
  name: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  shortName?: string

  @IsOptional()
  @IsString()
  @MaxLength(30)
  contactPhone?: string

  @IsOptional()
  @IsString()
  @MaxLength(120)
  region?: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string

  @IsOptional()
  businessHours?: Record<string, any>

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  defaultArea?: number

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  status?: number

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  sortNo?: number

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string
}

export class TenantAdminUserQueryDto extends PagerDto {
  @IsOptional()
  @IsString()
  username?: string

  @IsOptional()
  @IsString()
  nickname?: string

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  status?: number
}

export class TenantAdminUserDto {
  @IsOptional()
  @IsString()
  avatar?: string

  @IsString()
  @Matches(/^[\s\S]+$/)
  @MinLength(4)
  @MaxLength(20)
  username: string

  @IsOptional()
  @Matches(/^\S*(?=\S{6})(?=\S*\d)(?=\S*[A-Z])\S*$/i, {
    message: '密码必须包含数字、字母，长度为 6-16 位',
  })
  password?: string

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  roleIds: number[]

  @IsOptional()
  @IsString()
  nickname?: string

  @IsOptional()
  @IsEmail()
  email?: string

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsString()
  remark?: string

  @IsIn([0, 1])
  status: number

  @IsArray()
  @ArrayMinSize(1)
  areaIds: number[]

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  defaultAreaId?: number
}

export class TenantAdminUserUpdateDto extends PartialType(TenantAdminUserDto) {}
