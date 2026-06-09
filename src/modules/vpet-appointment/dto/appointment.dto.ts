import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator'

export class CreateAppointmentDto {
  @IsInt()
  customerId: number

  @IsInt()
  petId: number

  @IsOptional()
  @IsString()
  visitType?: string

  @IsOptional()
  @IsString()
  reason?: string

  @IsOptional()
  @IsInt()
  doctorId?: number

  @IsDateString()
  appointmentTime: string

  @IsOptional()
  @IsString()
  remark?: string
}

export class UpdateAppointmentDto {
  @IsOptional()
  @IsInt()
  customerId?: number

  @IsOptional()
  @IsInt()
  petId?: number

  @IsOptional()
  @IsString()
  visitType?: string

  @IsOptional()
  @IsString()
  reason?: string

  @IsOptional()
  @IsInt()
  doctorId?: number

  @IsOptional()
  @IsInt()
  status?: number

  @IsOptional()
  @IsDateString()
  appointmentTime?: string

  @IsOptional()
  @IsString()
  remark?: string
}
