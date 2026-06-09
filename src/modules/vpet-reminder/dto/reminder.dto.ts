import { IsDateString, IsInt, IsOptional, IsString, MaxLength } from 'class-validator'
import { PagerDto } from '~/common/dto/pager.dto'

export class QueryReminderDto extends PagerDto {
  @IsOptional()
  @IsInt()
  customerId?: number

  @IsOptional()
  @IsInt()
  petId?: number

  @IsOptional()
  @IsInt()
  status?: number

  @IsOptional()
  @IsInt()
  type?: number

  @IsOptional()
  @IsString()
  keyword?: string
}

export class CreateReminderDto {
  @IsInt()
  customerId: number

  @IsInt()
  petId: number

  @IsOptional()
  @IsInt()
  visitId?: number

  @IsInt()
  type: number

  @IsString()
  @MaxLength(100)
  reminderName: string

  @IsDateString()
  dueDate: string

  @IsOptional()
  @IsString()
  @MaxLength(20)
  channel?: string

  @IsOptional()
  @IsString()
  remark?: string
}

export class UpdateReminderDto {
  @IsOptional()
  @IsInt()
  status?: number

  @IsOptional()
  @IsDateString()
  dueDate?: string

  @IsOptional()
  @IsString()
  reminderName?: string

  @IsOptional()
  @IsString()
  channel?: string

  @IsOptional()
  @IsString()
  remark?: string
}
