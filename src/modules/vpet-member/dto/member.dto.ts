import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator'
import { PagerDto } from '~/common/dto/pager.dto'

export class OpenCardDto {
  @IsInt()
  customerId: number

  @IsOptional()
  @IsInt()
  level?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  initialBalance?: number

  @IsOptional()
  @IsNumber()
  giftAmount?: number
}

export class RechargeDto {
  @IsNumber()
  @Min(0)
  amount: number

  @IsOptional()
  @IsInt()
  operatorId?: number

  @IsOptional()
  @IsString()
  remark?: string
}

export class DeductDto {
  @IsNumber()
  @Min(0)
  amount: number

  @IsOptional()
  @IsInt()
  billingId?: number

  @IsOptional()
  @IsInt()
  operatorId?: number

  @IsOptional()
  @IsString()
  remark?: string
}

export class QueryMemberCardDto extends PagerDto {
  @IsOptional()
  @IsString()
  keyword?: string

  @IsOptional()
  @IsInt()
  customerId?: number

  @IsOptional()
  @IsInt()
  status?: number

  @IsOptional()
  @IsInt()
  level?: number
}

export class QueryMemberCardLogDto extends PagerDto {}
