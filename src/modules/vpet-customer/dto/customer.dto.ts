import { IntersectionType, PartialType } from '@nestjs/swagger'
import { IsMobilePhone, IsOptional, IsString, MaxLength } from 'class-validator'
import { PagerDto } from '~/common/dto/pager.dto'

export class CreateCustomerDto {
  @IsString()
  @MaxLength(50)
  name: string

  @IsMobilePhone('zh-CN')
  phone: string

  @IsOptional()
  @IsString()
  wechatOpenid?: string

  @IsOptional()
  gender?: number

  @IsOptional()
  birthday?: string

  @IsOptional()
  @IsString()
  address?: string

  @IsOptional()
  @IsString()
  tags?: string

  @IsOptional()
  @IsString()
  remark?: string
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}

export class QueryCustomerDto extends IntersectionType(
  PagerDto,
  PartialType(CreateCustomerDto),
) {
  @IsOptional()
  @IsString()
  keyword?: string
}
