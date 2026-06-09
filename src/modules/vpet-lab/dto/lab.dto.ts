import { Type } from 'class-transformer'
import { ArrayMinSize, IsArray, IsDateString, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator'
import { PagerDto } from '~/common/dto/pager.dto'

export class LabResultItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  itemCode?: string

  @IsString()
  @MaxLength(100)
  itemName: string

  @IsOptional()
  @IsString()
  resultValue?: string

  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string

  @IsOptional()
  @IsNumber()
  refMin?: number

  @IsOptional()
  @IsNumber()
  refMax?: number

  @IsOptional()
  @IsString()
  @MaxLength(5)
  flag?: string
}

export class CreateLabOrderDto {
  @IsInt()
  visitId: number

  @IsOptional()
  @IsInt()
  customerId: number

  @IsOptional()
  @IsInt()
  petId: number

  @IsOptional()
  @IsInt()
  doctorId?: number

  @IsOptional()
  @IsInt()
  templateId?: number

  @IsOptional()
  @IsString()
  @MaxLength(100)
  testName?: string

  @IsOptional()
  @IsInt()
  category?: number

  @IsOptional()
  @IsString()
  @MaxLength(50)
  sampleType?: string

  @IsOptional()
  @IsString()
  sourceType?: string

  @IsOptional()
  @IsInt()
  sourceId?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  chargeAmount?: number

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LabResultItemDto)
  items?: LabResultItemDto[]
}

export class UpdateLabReportDto {
  @IsOptional()
  @IsDateString()
  sampledAt?: string

  @IsOptional()
  @IsDateString()
  reportedAt?: string

  @IsOptional()
  @IsString()
  reportSummary?: string

  @IsOptional()
  @IsInt()
  status?: number

  @IsOptional()
  structuredReport?: Record<string, any>

  @IsOptional()
  @IsArray()
  rawReportFiles?: Array<Record<string, any>>

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LabResultItemDto)
  items: LabResultItemDto[]
}

export class SubmitLisOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  barcode?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  deviceCode?: string
}

export class QueryLabOrderDto extends PagerDto {
  @IsOptional()
  @IsInt()
  visitId?: number

  @IsOptional()
  @IsInt()
  doctorId?: number

  @IsOptional()
  @IsInt()
  status?: number

  @IsOptional()
  @IsString()
  keyword?: string
}

export class CreateLabTemplateDto {
  @IsString()
  @MaxLength(50)
  code: string

  @IsString()
  @MaxLength(100)
  name: string

  @IsOptional()
  @IsInt()
  category?: number

  @IsOptional()
  @IsString()
  @MaxLength(30)
  speciesScope?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  sampleType?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultChargeAmount?: number

  @IsOptional()
  resultSchema?: Record<string, any>

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsInt()
  isActive?: number
}
