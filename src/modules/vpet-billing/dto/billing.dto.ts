import { Type } from 'class-transformer'
import { IsArray, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator'
import { PagerDto } from '~/common/dto/pager.dto'

export class BillDetailDto {
  @IsInt()
  itemType: number

  @IsString()
  itemName: string

  @IsOptional()
  @IsInt()
  itemId?: number

  @IsOptional()
  @IsString()
  sourceType?: string

  @IsOptional()
  @IsInt()
  sourceId?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number

  @IsNumber()
  @Min(0)
  unitPrice: number

  @IsOptional()
  @IsNumber()
  amount?: number

  @IsOptional()
  itemSnapshot?: Record<string, any>
}

export class CreateBillingDto {
  @IsInt()
  visitId: number

  @IsOptional()
  @IsInt()
  customerId: number

  @IsOptional()
  @IsInt()
  petId?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number

  @IsOptional()
  @IsInt()
  paymentMethod?: number

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BillDetailDto)
  details: BillDetailDto[]
}

export class PaymentDto {
  @IsInt()
  paymentMethod: number

  @IsNumber()
  @Min(0)
  paidAmount: number

  @IsOptional()
  @IsInt()
  cashierId?: number

  @IsOptional()
  @IsInt()
  customerId?: number

  @IsOptional()
  @IsInt()
  memberCardId?: number

  @IsOptional()
  @IsString()
  tradeNo?: string

  @IsOptional()
  @IsString()
  remark?: string
}

export class RefundDto {
  @IsNumber()
  @Min(0.01)
  refundAmount: number

  @IsOptional()
  @IsInt()
  paymentId?: number

  @IsOptional()
  @IsInt()
  operatorId?: number

  @IsOptional()
  @IsString()
  reason?: string
}

export class QueryBillingDto extends PagerDto {
  @IsOptional()
  @IsInt()
  customerId?: number

  @IsOptional()
  @IsInt()
  visitId?: number

  @IsOptional()
  @IsInt()
  paymentStatus?: number
}
