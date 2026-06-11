import { IntersectionType, PartialType } from '@nestjs/swagger'
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator'
import { PagerDto } from '~/common/dto/pager.dto'

export class CreateDoctorDto {
  @IsOptional()
  @IsInt()
  userId?: number

  @IsString()
  @MaxLength(50)
  name: string

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsString()
  title?: string

  @IsOptional()
  @IsString()
  @MaxLength(32)
  position?: string

  @IsOptional()
  @IsString()
  department?: string

  @IsOptional()
  @IsString()
  introduction?: string

  @IsOptional()
  @IsInt()
  bookable?: number
}

export class UpdateDoctorDto extends PartialType(CreateDoctorDto) {}

export class QueryDoctorDto extends IntersectionType(
  PagerDto,
  PartialType(CreateDoctorDto),
) {
  @IsOptional()
  @IsInt()
  status?: number

  @IsOptional()
  @IsInt()
  bookable?: number

  @IsOptional()
  @IsString()
  keyword?: string
}
