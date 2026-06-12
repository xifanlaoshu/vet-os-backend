import { Transform } from 'class-transformer'
import { IsInt, IsOptional, IsString } from 'class-validator'
import { PagerDto } from '~/common/dto/pager.dto'

export class QueryAuditEventDto extends PagerDto {
  @IsOptional()
  @IsString()
  source?: string

  @IsOptional()
  @IsString()
  bizType?: string

  @IsOptional()
  @IsInt()
  @Transform(({ value: val }) => (val ? Number.parseInt(val) : undefined), { toClassOnly: true })
  bizId?: number

  @IsOptional()
  @IsString()
  action?: string

  @IsOptional()
  @IsString()
  startDate?: string

  @IsOptional()
  @IsString()
  endDate?: string
}
