import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { IdParam } from '~/common/decorators/id-param.decorator'
import { BillingService } from './billing.service'
import { CreateBillingDto, PaymentDto, QueryBillingDto, RefundDto } from './dto/billing.dto'

@ApiTags('VPet - Billing')
@Controller('vpet/billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get()
  @ApiOperation({ summary: 'Billing list' })
  async list(@Query() dto: QueryBillingDto) {
    return this.billingService.list(dto)
  }

  @Post()
  @ApiOperation({ summary: 'Create billing' })
  async create(@Body() dto: CreateBillingDto) {
    return this.billingService.createBill(dto)
  }

  @Get('visit/:visitId')
  @ApiOperation({ summary: 'Billing by visit' })
  async getByVisit(@Param('visitId') visitId: number) {
    return this.billingService.getByVisit(visitId)
  }

  @Post('visit/:visitId/sync')
  @ApiOperation({ summary: 'Sync prescription fees into billing' })
  async syncVisit(@Param('visitId') visitId: number) {
    return this.billingService.syncVisitPrescriptionBilling(visitId)
  }

  @Post(':id/pay')
  @ApiOperation({ summary: 'Process payment' })
  async pay(@IdParam() id: number, @Body() dto: PaymentDto) {
    return this.billingService.processPayment(id, dto)
  }

  @Post(':id/refund')
  @ApiOperation({ summary: 'Process refund' })
  async refund(@IdParam() id: number, @Body() dto: RefundDto) {
    return this.billingService.processRefund(id, dto)
  }

  @Get('stats/today')
  @ApiOperation({ summary: 'Today billing stats' })
  async getTodayStats() {
    return this.billingService.getTodayStats()
  }

  @Get(':id')
  @ApiOperation({ summary: 'Billing detail' })
  async get(@IdParam() id: number) {
    return this.billingService.getById(id)
  }
}
