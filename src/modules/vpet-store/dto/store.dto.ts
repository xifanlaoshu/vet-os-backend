import { Type } from 'class-transformer'
import { ArrayMinSize, IsArray, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator'
import { PagerDto } from '~/common/dto/pager.dto'

export class QueryStoreDto extends PagerDto {
  @IsOptional()
  @IsString()
  keyword?: string
}

export class CreateStoreDto {
  @IsString()
  @MaxLength(30)
  storeCode: string

  @IsString()
  @MaxLength(100)
  storeName: string

  @IsOptional()
  @IsString()
  contactName?: string

  @IsOptional()
  @IsString()
  contactPhone?: string

  @IsOptional()
  @IsString()
  address?: string
}

export class SetStoreStockDto {
  @IsInt()
  drugId: number

  @IsNumber()
  @Min(0)
  quantity: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  safetyStock?: number
}

export class TransferItemDto {
  @IsInt()
  drugId: number

  @IsNumber()
  @Min(0.01)
  quantity: number
}

export class CreateTransferDto {
  @IsInt()
  sourceStoreId: number

  @IsInt()
  targetStoreId: number

  @IsOptional()
  @IsString()
  reason?: string

  @IsOptional()
  @IsInt()
  requestedBy?: number

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TransferItemDto)
  items: TransferItemDto[]
}

export class ApproveTransferDto {
  @IsOptional()
  @IsInt()
  approvedBy?: number
}
