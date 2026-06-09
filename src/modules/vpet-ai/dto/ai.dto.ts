import { Type } from 'class-transformer'
import { IsArray, IsInt, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator'
import { PagerDto } from '~/common/dto/pager.dto'

export class SoapDraftDto {
  @IsOptional()
  @IsString()
  species?: string

  @IsOptional()
  @IsString()
  petName?: string

  @IsString()
  chiefComplaint: string

  @IsOptional()
  @IsString()
  objectiveFindings?: string

  @IsOptional()
  @IsString()
  draftNotes?: string
}

export class LabInterpretItemDto {
  @IsString()
  itemName: string

  @IsString()
  resultValue: string

  @IsOptional()
  @IsString()
  unit?: string

  @IsOptional()
  @IsNumber()
  refMin?: number

  @IsOptional()
  @IsNumber()
  refMax?: number
}

export class LabInterpretDto {
  @IsOptional()
  @IsString()
  petName?: string

  @IsOptional()
  @IsString()
  species?: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LabInterpretItemDto)
  items: LabInterpretItemDto[]
}

export class QueryAiLogDto extends PagerDto {
  @IsOptional()
  @IsString()
  taskType?: string

  @IsOptional()
  @IsString()
  bizType?: string

  @IsOptional()
  @IsInt()
  bizId?: number
}
