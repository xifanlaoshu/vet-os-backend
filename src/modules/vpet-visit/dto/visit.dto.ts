import { IsArray, IsDateString, IsInt, IsJSON, IsOptional, IsString, MaxLength } from 'class-validator'

export class CreateVisitDto {
  @IsOptional()
  @IsInt()
  appointmentId?: number

  @IsInt()
  petId: number

  @IsInt()
  customerId: number

  @IsInt()
  type: number

  @IsOptional()
  @IsString()
  department?: string

  @IsOptional()
  @IsInt()
  doctorId?: number
}

export class UpdateVisitDto {
  @IsOptional()
  @IsInt()
  status?: number

  @IsOptional()
  @IsInt()
  careMode?: number

  @IsOptional()
  @IsInt()
  careStage?: number

  @IsOptional()
  @IsString()
  chiefComplaint?: string

  @IsOptional()
  @IsJSON()
  physicalExam?: string

  @IsOptional()
  @IsJSON()
  diagnosis?: string

  @IsOptional()
  @IsString()
  assessmentText?: string

  @IsOptional()
  @IsString()
  treatmentPlan?: string

  @IsOptional()
  @IsString()
  doctorAdvice?: string

  @IsOptional()
  @IsDateString()
  followUpDate?: string

  @IsOptional()
  @IsJSON()
  ongoingFlags?: string

  @IsOptional()
  @IsDateString()
  startTime?: string

  @IsOptional()
  @IsDateString()
  endTime?: string

  @IsOptional()
  @IsString()
  progressBatchNo?: string

  @IsOptional()
  @IsString()
  symptomSummary?: string

  @IsOptional()
  @IsString()
  statusSummary?: string

  @IsOptional()
  @IsString()
  progressAssessmentText?: string

  @IsOptional()
  @IsString()
  planBatchNo?: string

  @IsOptional()
  @IsString()
  planSummary?: string

  @IsOptional()
  @IsJSON()
  structuredActions?: string

  @IsOptional()
  @IsJSON()
  followUpActions?: string
}

export class CreateDiagnosisCodeDto {
  @IsString()
  @MaxLength(10)
  code: string

  @IsString()
  @MaxLength(100)
  name: string

  @IsString()
  @MaxLength(30)
  category: string

  @IsOptional()
  @IsString()
  @MaxLength(20)
  speciesScope?: string
}

export class UpdateDiagnosisCodeDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(30)
  category?: string

  @IsOptional()
  @IsString()
  @MaxLength(20)
  speciesScope?: string
}

export class QueryDiagnosisCodeDto {
  @IsOptional()
  @IsInt()
  page?: number

  @IsOptional()
  @IsInt()
  pageSize?: number

  @IsOptional()
  @IsString()
  keyword?: string

  @IsOptional()
  @IsString()
  category?: string

  @IsOptional()
  @IsString()
  species?: string
}

export class QueryVisitDto {
  @IsOptional()
  @IsInt()
  page?: number

  @IsOptional()
  @IsInt()
  pageSize?: number

  @IsOptional()
  @IsInt()
  petId?: number

  @IsOptional()
  @IsInt()
  customerId?: number

  @IsOptional()
  @IsInt()
  doctorId?: number

  @IsOptional()
  @IsInt()
  status?: number

  @IsOptional()
  @IsInt()
  appointmentId?: number

  @IsOptional()
  @IsString()
  keyword?: string

  @IsOptional()
  @IsDateString()
  dateFrom?: string

  @IsOptional()
  @IsDateString()
  dateTo?: string
}

export class CreateVisitCareFollowupDto {
  @IsOptional()
  @IsDateString()
  occurredAt?: string

  @IsOptional()
  @IsInt()
  careStage?: number

  @IsOptional()
  @IsString()
  symptomSummary?: string

  @IsOptional()
  @IsString()
  statusSummary?: string

  @IsOptional()
  @IsJSON()
  vitalSigns?: string

  @IsOptional()
  @IsString()
  objectiveNote?: string

  @IsOptional()
  @IsString()
  assessmentText?: string

  @IsOptional()
  @IsString()
  planAdjustment?: string

  @IsOptional()
  @IsString()
  medicationAdjustment?: string

  @IsOptional()
  @IsString()
  remark?: string

  @IsOptional()
  @IsInt()
  recordedBy?: number

  @IsOptional()
  @IsArray()
  labOrderIds?: number[]

  @IsOptional()
  @IsArray()
  prescriptionIds?: number[]
}

export class CreateChronicCaseDto {
  @IsInt()
  customerId: number

  @IsInt()
  petId: number

  @IsOptional()
  @IsInt()
  visitId?: number

  @IsString()
  diseaseName: string

  @IsOptional()
  @IsJSON()
  diseaseTags?: string

  @IsOptional()
  @IsString()
  initialSummary?: string

  @IsOptional()
  @IsString()
  managementGoal?: string

  @IsOptional()
  @IsJSON()
  carePlan?: string

  @IsOptional()
  @IsJSON()
  trackingSchema?: string

  @IsOptional()
  @IsDateString()
  nextReviewDate?: string
}

export class CreateChronicFollowupDto {
  @IsOptional()
  @IsInt()
  visitId?: number

  @IsOptional()
  @IsDateString()
  reviewDate?: string

  @IsOptional()
  @IsString()
  symptomSummary?: string

  @IsOptional()
  @IsString()
  statusSummary?: string

  @IsOptional()
  @IsJSON()
  metricValues?: string

  @IsOptional()
  @IsString()
  planAdjustment?: string

  @IsOptional()
  @IsDateString()
  nextReviewDate?: string
}

export class SoapDto {
  @IsOptional()
  @IsString()
  subjective?: string

  @IsOptional()
  @IsJSON()
  objective?: string

  @IsOptional()
  @IsJSON()
  assessment?: string

  @IsOptional()
  @IsString()
  plan?: string
}

export class LockEmrDto {
  @IsOptional()
  @IsString()
  reason?: string

  @IsOptional()
  @IsInt()
  operatorId?: number
}

export class RequestUnlockEmrDto {
  @IsString()
  reason: string

  @IsOptional()
  @IsInt()
  operatorId?: number
}

export class ReviewUnlockEmrDto {
  @IsInt()
  status: number

  @IsOptional()
  @IsString()
  remark?: string

  @IsOptional()
  @IsInt()
  operatorId?: number
}

export class SignEmrDto {
  @IsOptional()
  @IsString()
  signType?: string

  @IsOptional()
  @IsString()
  reason?: string

  @IsOptional()
  @IsInt()
  operatorId?: number
}
