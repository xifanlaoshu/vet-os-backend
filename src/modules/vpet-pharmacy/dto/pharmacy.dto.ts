import { IntersectionType, PartialType } from '@nestjs/swagger'
import { IsArray, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator'
import { PagerDto } from '~/common/dto/pager.dto'

export class CreateDrugDto {
  @IsString()
  @MaxLength(30)
  drugCode: string

  @IsString()
  @MaxLength(100)
  drugName: string

  @IsOptional()
  @IsString()
  tradeName?: string

  @IsOptional()
  @IsInt()
  category?: number

  @IsOptional()
  @IsInt()
  drugType?: number

  @IsOptional()
  @IsString()
  specification?: string

  @IsOptional()
  @IsString()
  unit?: string

  @IsOptional()
  @IsString()
  dosageUnit?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  packageContentQuantity?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  retailPrice?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  dosageUnitPrice?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  minStock?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  purchasePrice?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  currentStock?: number

  @IsOptional()
  @IsString()
  supplier?: string

  @IsOptional()
  @IsString()
  expireDate?: string
}

export class UpdateDrugDto extends PartialType(CreateDrugDto) {}

export class QueryDrugDto extends IntersectionType(
  PagerDto,
  PartialType(CreateDrugDto),
) {
  @IsOptional()
  @IsString()
  keyword?: string
}

export class CreateChargeItemDto {
  @IsString()
  @MaxLength(30)
  itemCode: string

  @IsString()
  @MaxLength(100)
  itemName: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string

  @IsOptional()
  @IsString()
  specification?: string

  @IsOptional()
  @IsString()
  unit?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  retailPrice?: number

  @IsOptional()
  @IsInt()
  status?: number

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsArray()
  consentTemplateIds?: number[]
}

export class UpdateChargeItemDto extends PartialType(CreateChargeItemDto) {}

export class QueryChargeItemDto extends PagerDto {
  @IsOptional()
  @IsString()
  keyword?: string

  @IsOptional()
  @IsString()
  category?: string

  @IsOptional()
  @IsInt()
  status?: number
}

export class StockInDto {
  @IsNumber()
  @Min(0)
  quantity: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  purchasePrice?: number

  @IsOptional()
  @IsString()
  batchNo?: string

  @IsOptional()
  @IsString()
  expireDate?: string
}

export class QueryStockTxnDto extends PagerDto {
  @IsOptional()
  @IsInt()
  drugId?: number

  @IsOptional()
  @IsString()
  refType?: string

  @IsOptional()
  @IsInt()
  refId?: number
}
