import { PartialType } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { ArrayMinSize, IsArray, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator'
import { PagerDto } from '~/common/dto/pager.dto'

export class RxDetailDto {
  @IsOptional()
  @IsInt()
  itemKind?: number

  @IsOptional()
  @IsInt()
  itemId?: number

  @IsOptional()
  @IsString()
  @MaxLength(100)
  itemName?: string

  @IsOptional()
  @IsInt()
  drugId?: number

  @IsOptional()
  @IsInt()
  chargeItemId?: number

  @IsOptional()
  @IsString()
  @MaxLength(100)
  drugName?: string

  @IsOptional()
  @IsString()
  specification?: string

  @IsOptional()
  @IsString()
  dosage?: string

  @IsOptional()
  @IsString()
  @MaxLength(300)
  dosageFormula?: string

  @IsOptional()
  @IsString()
  dosageUnit?: string

  @IsOptional()
  @IsString()
  frequency?: string

  @IsOptional()
  @IsString()
  route?: string

  @IsOptional()
  @IsInt()
  duration?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number

  @IsOptional()
  @IsString()
  @MaxLength(300)
  quantityFormula?: string

  @IsNumber()
  @Min(0)
  unitPrice: number

  @IsOptional()
  @IsString()
  remark?: string
}

export class CreatePrescriptionDto {
  @IsInt()
  visitId: number

  @IsOptional()
  @IsInt()
  customerId?: number

  @IsOptional()
  @IsInt()
  petId?: number

  @IsOptional()
  @IsInt()
  hospitalizationId?: number

  @IsOptional()
  @IsInt()
  type?: number

  @IsOptional()
  @IsInt()
  doctorId: number

  @IsOptional()
  @IsString()
  batchNo?: string

  @IsOptional()
  @IsString()
  batchLabel?: string

  @IsOptional()
  @IsString()
  sourceType?: string

  @IsOptional()
  @IsInt()
  sourceId?: number

  @IsOptional()
  @IsString()
  diagnosisSummary?: string

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => RxDetailDto)
  details: RxDetailDto[]
}

export class ReviewPrescriptionDto {
  @IsInt()
  pharmacistId: number

  @IsInt()
  status: number
}

export class DispensePrescriptionDto {
  @IsOptional()
  @IsInt()
  pharmacistId?: number
}

export class QueryPrescriptionDto extends PagerDto {
  @IsOptional()
  @IsInt()
  visitId?: number

  @IsOptional()
  @IsInt()
  type?: number

  @IsOptional()
  @IsInt()
  doctorId?: number

  @IsOptional()
  @IsInt()
  status?: number
}

export class PrescriptionTemplateItemDto extends RxDetailDto {
  @IsOptional()
  @IsInt()
  sortNo?: number
}

export class CreatePrescriptionTemplateDto {
  @IsString()
  @MaxLength(50)
  templateCode: string

  @IsString()
  @MaxLength(100)
  templateName: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  speciesScope?: string

  @IsOptional()
  @IsInt()
  status?: number

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => PrescriptionTemplateItemDto)
  items: PrescriptionTemplateItemDto[]
}

export class UpdatePrescriptionTemplateDto extends PartialType(CreatePrescriptionTemplateDto) {}

export class QueryPrescriptionTemplateDto extends PagerDto {
  @IsOptional()
  @IsString()
  keyword?: string

  @IsOptional()
  @IsString()
  category?: string

  @IsOptional()
  @IsString()
  speciesScope?: string

  @IsOptional()
  @IsInt()
  status?: number
}
