import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { IdParam } from '~/common/decorators/id-param.decorator'
import { CreateInsuranceClaimDto, QueryInsuranceClaimDto, SettleInsuranceClaimDto } from './dto/insurance.dto'
import { InsuranceService } from './insurance.service'

@ApiTags('VPet - Insurance')
@Controller('vpet/insurance')
export class InsuranceController {
  constructor(private readonly insuranceService: InsuranceService) {}

  @Get()
  @ApiOperation({ summary: 'Insurance claim list' })
  async list(@Query() dto: QueryInsuranceClaimDto) {
    return this.insuranceService.list(dto)
  }

  @Post()
  @ApiOperation({ summary: 'Create insurance claim' })
  async create(@Body() dto: CreateInsuranceClaimDto) {
    return this.insuranceService.create(dto)
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit insurance claim' })
  async submit(@IdParam() id: number) {
    return this.insuranceService.submit(id)
  }

  @Post(':id/settle')
  @ApiOperation({ summary: 'Settle insurance claim' })
  async settle(@IdParam() id: number, @Body() dto: SettleInsuranceClaimDto) {
    return this.insuranceService.settle(id, dto)
  }
}
