import { IntersectionType, PartialType } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator'
import { PagerDto } from '~/common/dto/pager.dto'

export class CreateShiftDto {
  @IsString()
  @MaxLength(40)
  code: string

  @IsString()
  @MaxLength(80)
  name: string

  @IsString()
  startTime: string

  @IsString()
  endTime: string

  @IsOptional()
  @IsString()
  color?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  status?: number

  @IsOptional()
  @IsString()
  remark?: string
}

export class UpdateShiftDto extends PartialType(CreateShiftDto) {}

export class QueryShiftDto extends IntersectionType(
  PagerDto,
  PartialType(CreateShiftDto),
) {
  @IsOptional()
  @IsString()
  keyword?: string
}

export class QueryStaffScheduleDto {
  @IsString()
  month: string
}

export class SaveStaffScheduleDto {
  @Type(() => Number)
  @IsInt()
  doctorId: number

  @IsString()
  scheduleDate: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  shiftId?: number | null

  @IsOptional()
  @IsString()
  remark?: string
}
