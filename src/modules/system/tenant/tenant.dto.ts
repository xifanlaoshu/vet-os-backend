import { Type } from 'class-transformer'
import { IsArray, IsInt, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator'
import { PagerDto } from '~/common/dto/pager.dto'

export class TenantQueryDto extends PagerDto {
  @IsOptional()
  @IsString()
  keyword?: string

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  status?: number
}

export class TenantDto {
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
  @MaxLength(80)
  contactName?: string

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
  @IsString()
  @MaxLength(40)
  edition?: string

  @IsOptional()
  @IsInt()
  status?: number

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string
}

export class TenantAreaQueryDto extends PagerDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  tenantId?: number

  @IsOptional()
  @IsString()
  keyword?: string

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  status?: number
}

export class TenantAreaDto {
  @IsInt()
  @Type(() => Number)
  tenantId: number

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
  defaultArea?: number

  @IsOptional()
  @IsInt()
  status?: number

  @IsOptional()
  @IsInt()
  sortNo?: number

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string
}

export class UserAreaGrantItemDto {
  @IsInt()
  tenantId: number

  @IsInt()
  areaId: number

  @IsOptional()
  @IsInt()
  defaultArea?: number
}

export class UserAreaGrantDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserAreaGrantItemDto)
  items: UserAreaGrantItemDto[]
}
