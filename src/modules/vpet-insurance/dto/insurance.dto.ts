import { IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator'
import { PagerDto } from '~/common/dto/pager.dto'

export class QueryInsuranceClaimDto extends PagerDto {
  @IsOptional()
  @IsInt()
  status?: number

  @IsOptional()
  @IsString()
  keyword?: string
}

export class CreateInsuranceClaimDto {
  @IsInt()
  visitId: number

  @IsOptional()
  @IsInt()
  billingId?: number

  @IsInt()
  customerId: number

  @IsInt()
  petId: number

  @IsString()
  @MaxLength(100)
  providerName: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  policyNo?: string

  @IsNumber()
  @Min(0)
  claimAmount: number

  @IsOptional()
  @IsString()
  remark?: string
}

export class SettleInsuranceClaimDto {
  @IsNumber()
  @Min(0)
  approvedAmount: number

  @IsOptional()
  @IsString()
  remark?: string
}
