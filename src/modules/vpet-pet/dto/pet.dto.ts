import { IntersectionType, OmitType, PartialType } from '@nestjs/swagger'
import { IsDateString, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator'
import { PagerDto } from '~/common/dto/pager.dto'

export class CreatePetDto {
  @IsInt()
  customerId: number

  @IsString()
  @MaxLength(50)
  name: string

  @IsString()
  @MaxLength(20)
  species: string

  @IsString()
  @MaxLength(50)
  breed: string

  @IsInt()
  gender: number

  @IsOptional()
  @IsInt()
  neutered?: number

  @IsOptional()
  @IsDateString()
  birthday?: string

  @IsOptional()
  @IsString()
  color?: string

  @IsOptional()
  @Min(0)
  weight?: number

  @IsOptional()
  @IsString()
  photo?: string

  @IsOptional()
  @IsString()
  allergy?: string

  @IsOptional()
  @IsString()
  behaviorTag?: string

  @IsOptional()
  @IsInt()
  lifeStage?: number
}

export class UpdatePetDto extends PartialType(CreatePetDto) {}

export class QueryPetDto extends IntersectionType(
  PagerDto,
  PartialType(OmitType(CreatePetDto, ['customerId'] as const)),
) {
  @IsOptional()
  @IsInt()
  customerId?: number

  @IsOptional()
  @IsString()
  keyword?: string
}
