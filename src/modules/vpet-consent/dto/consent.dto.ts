import { PartialType } from '@nestjs/swagger'
import { IsArray, IsDateString, IsInt, IsOptional, IsString, MaxLength } from 'class-validator'
import { PagerDto } from '~/common/dto/pager.dto'

export class QueryConsentTemplateDto extends PagerDto {
  @IsOptional()
  @IsString()
  category?: string

  @IsOptional()
  @IsString()
  keyword?: string

  @IsOptional()
  @IsInt()
  isActive?: number
}

export class CreateConsentTemplateDto {
  @IsString()
  @MaxLength(50)
  code: string

  @IsString()
  @MaxLength(120)
  name: string

  @IsString()
  @MaxLength(40)
  category: string

  @IsOptional()
  @IsString()
  @MaxLength(30)
  speciesScope?: string

  @IsOptional()
  @IsString()
  @MaxLength(20)
  riskLevel?: string

  @IsString()
  content: string

  @IsOptional()
  @IsArray()
  variables?: Array<Record<string, any>>

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsInt()
  isActive?: number
}

export class UpdateConsentTemplateDto extends PartialType(CreateConsentTemplateDto) {}

export class QueryConsentRecordDto extends PagerDto {
  @IsOptional()
  @IsInt()
  visitId?: number

  @IsOptional()
  @IsInt()
  customerId?: number

  @IsOptional()
  @IsInt()
  petId?: number

  @IsOptional()
  @IsString()
  category?: string

  @IsOptional()
  @IsInt()
  status?: number

  @IsOptional()
  @IsString()
  keyword?: string
}

export class CreateConsentRecordDto {
  @IsInt()
  templateId: number

  @IsOptional()
  @IsInt()
  visitId?: number

  @IsOptional()
  @IsInt()
  customerId?: number

  @IsOptional()
  @IsInt()
  petId?: number

  @IsOptional()
  @IsInt()
  doctorId?: number

  @IsOptional()
  @IsString()
  guardianName?: string

  @IsOptional()
  @IsString()
  guardianPhone?: string

  @IsOptional()
  @IsString()
  remark?: string
}

export class SignConsentRecordDto {
  @IsString()
  @MaxLength(50)
  guardianName: string

  @IsOptional()
  @IsString()
  @MaxLength(20)
  guardianPhone?: string

  @IsOptional()
  @IsString()
  signatureData?: string

  @IsOptional()
  @IsDateString()
  signedAt?: string
}
