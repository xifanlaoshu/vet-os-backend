import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { IdParam } from '~/common/decorators/id-param.decorator'
import { AuthUser } from '~/modules/auth/decorators/auth-user.decorator'
import { Perm } from '~/modules/auth/decorators/permission.decorator'
import { BillingService } from './billing.service'
import { CreateBillingDto, PaymentDto, QueryBillingDto, RefundDto } from './dto/billing.dto'

@ApiTags('VPet - Billing')
@Perm('vpet:billing:list')
@Controller('vpet/billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get()
  @ApiOperation({ summary: 'Billing list' })
  async list(@Query() dto: QueryBillingDto, @AuthUser() user: IAuthUser) {
    return this.billingService.list(dto, user)
  }

  @Post()
  @ApiOperation({ summary: 'Create billing' })
  async create(@Body() dto: CreateBillingDto, @AuthUser() user: IAuthUser) {
    return this.billingService.createBill(dto, user)
  }

  @Get('visit/:visitId')
  @ApiOperation({ summary: 'Billing by visit' })
  async getByVisit(@Param('visitId') visitId: number, @AuthUser() user: IAuthUser) {
    return this.billingService.getByVisit(visitId, user)
  }

  @Post('visit/:visitId/sync')
  @ApiOperation({ summary: 'Sync prescription fees into billing' })
  async syncVisit(@Param('visitId') visitId: number, @AuthUser() user: IAuthUser) {
    return this.billingService.syncVisitPrescriptionBilling(visitId, user)
  }

  @Post(':id/pay')
  @ApiOperation({ summary: 'Process payment' })
  async pay(@IdParam() id: number, @Body() dto: PaymentDto, @AuthUser() user: IAuthUser) {
    return this.billingService.processPayment(id, dto, user)
  }

  @Post(':id/refund')
  @ApiOperation({ summary: 'Process refund' })
  async refund(@IdParam() id: number, @Body() dto: RefundDto, @AuthUser() user: IAuthUser) {
    return this.billingService.processRefund(id, dto, user)
  }

  @Get('stats/today')
  @ApiOperation({ summary: 'Today billing stats' })
  async getTodayStats(@AuthUser() user: IAuthUser) {
    return this.billingService.getTodayStats(user)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Billing detail' })
  async get(@IdParam() id: number, @AuthUser() user: IAuthUser) {
    return this.billingService.getById(id, user)
  }
}
