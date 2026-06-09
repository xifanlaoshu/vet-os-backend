import { IsDateString, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator'
import { PagerDto } from '~/common/dto/pager.dto'

export class CreateHospitalizationDto {
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
  @IsString()
  @MaxLength(30)
  cageCode?: string

  @IsOptional()
  @IsDateString()
  admissionAt?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  dailyFee?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  depositAmount?: number

  @IsOptional()
  @IsInt()
  nursingLevel?: number

  @IsOptional()
  @IsNumber()
  weightAtAdmission?: number

  @IsOptional()
  @IsString()
  admissionDiagnosis?: string

  @IsOptional()
  @IsString()
  remark?: string
}

export class QueryHospitalizationDto extends PagerDto {
  @IsOptional()
  @IsInt()
  status?: number

  @IsOptional()
  @IsInt()
  doctorId?: number

  @IsOptional()
  @IsString()
  keyword?: string
}

export class CreateNursingPlanDto {
  @IsInt()
  planType: number

  @IsString()
  @MaxLength(150)
  planName: string

  @IsOptional()
  @IsString()
  instruction?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  frequency?: string

  @IsDateString()
  scheduledTime: string

  @IsOptional()
  @IsInt()
  doctorId?: number
}

export class ExecuteNursingPlanDto {
  @IsOptional()
  @IsInt()
  executorId?: number

  @IsOptional()
  @IsString()
  @MaxLength(50)
  executorName?: string

  @IsOptional()
  @IsInt()
  status?: number

  @IsOptional()
  @IsDateString()
  executedAt?: string

  @IsOptional()
  @IsString()
  resultNote?: string

  @IsOptional()
  vitalSigns?: Record<string, any>
}

export class DischargeHospitalizationDto {
  @IsOptional()
  @IsDateString()
  dischargeAt?: string

  @IsOptional()
  @IsString()
  dischargeSummary?: string
}
