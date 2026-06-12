import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { IdParam } from '~/common/decorators/id-param.decorator'
import { AuthUser } from '~/modules/auth/decorators/auth-user.decorator'
import { CreateInsuranceClaimDto, QueryInsuranceClaimDto, SettleInsuranceClaimDto } from './dto/insurance.dto'
import { InsuranceService } from './insurance.service'

@ApiTags('VPet - Insurance')
@Controller('vpet/insurance')
export class InsuranceController {
  constructor(private readonly insuranceService: InsuranceService) {}

  @Get()
  @ApiOperation({ summary: 'Insurance claim list' })
  async list(@Query() dto: QueryInsuranceClaimDto, @AuthUser() user: IAuthUser) {
    return this.insuranceService.list(dto, user)
  }

  @Post()
  @ApiOperation({ summary: 'Create insurance claim' })
  async create(@Body() dto: CreateInsuranceClaimDto, @AuthUser() user: IAuthUser) {
    return this.insuranceService.create(dto, user)
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit insurance claim' })
  async submit(@IdParam() id: number, @AuthUser() user: IAuthUser) {
    return this.insuranceService.submit(id, user)
  }

  @Post(':id/settle')
  @ApiOperation({ summary: 'Settle insurance claim' })
  async settle(@IdParam() id: number, @Body() dto: SettleInsuranceClaimDto, @AuthUser() user: IAuthUser) {
    return this.insuranceService.settle(id, dto, user)
  }
}
