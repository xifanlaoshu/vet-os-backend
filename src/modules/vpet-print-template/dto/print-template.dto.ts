import { IsIn, IsInt, IsJSON, IsOptional, IsString, MaxLength } from 'class-validator'
import { PagerDto } from '~/common/dto/pager.dto'

export class QueryPrintTemplateDto extends PagerDto {
  @IsOptional()
  @IsString()
  keyword?: string

  @IsOptional()
  @IsString()
  templateType?: string

  @IsOptional()
  @IsInt()
  status?: number
}

export class CreatePrintTemplateDto {
  @IsOptional()
  @IsInt()
  areaId?: number

  @IsString()
  @MaxLength(60)
  code: string

  @IsString()
  @MaxLength(120)
  name: string

  @IsString()
  @MaxLength(40)
  templateType: string

  @IsOptional()
  @IsIn(['a4', 'a5', 'thermal_58', 'thermal_80'])
  paperType?: string

  @IsOptional()
  @IsInt()
  defaultTemplate?: number

  @IsOptional()
  @IsString()
  templateHeader?: string

  @IsString()
  templateBody: string

  @IsOptional()
  @IsString()
  templateFooter?: string

  @IsOptional()
  @IsJSON()
  styleConfig?: string

  @IsOptional()
  @IsJSON()
  variableSchema?: string

  @IsOptional()
  @IsInt()
  status?: number

  @IsOptional()
  @IsString()
  remark?: string
}

export class UpdatePrintTemplateDto extends CreatePrintTemplateDto {}
