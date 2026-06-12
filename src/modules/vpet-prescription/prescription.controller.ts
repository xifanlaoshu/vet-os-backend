import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { ApiResult } from '~/common/decorators/api-result.decorator'
import { IdParam } from '~/common/decorators/id-param.decorator'
import { AuthUser } from '~/modules/auth/decorators/auth-user.decorator'
import { Perm } from '~/modules/auth/decorators/permission.decorator'
import {
  CreatePrescriptionDto,
  CreatePrescriptionTemplateDto,
  DispensePrescriptionDto,
  QueryPrescriptionDto,
  QueryPrescriptionTemplateDto,
  ReviewPrescriptionDto,
  UpdatePrescriptionTemplateDto,
} from './dto/prescription.dto'
import { PrescriptionEntity } from './entities/prescription.entity'
import { PrescriptionService } from './prescription.service'

@ApiTags('VPet - Prescription')
@Perm('vpet:prescription:list')
@Controller('vpet/prescription')
export class PrescriptionController {
  constructor(private readonly rxService: PrescriptionService) {}

  @Get()
  @ApiOperation({ summary: 'Prescription list' })
  async list(@Query() dto: QueryPrescriptionDto, @AuthUser() user: IAuthUser) {
    return this.rxService.queryList(dto, user)
  }

  @Post()
  @ApiOperation({ summary: 'Create prescription' })
  @ApiResult({ type: PrescriptionEntity })
  async create(@Body() dto: CreatePrescriptionDto, @AuthUser() user: IAuthUser) {
    return this.rxService.createRx(dto, {
      currentUserId: user?.uid,
      tenantId: user?.tenantId,
      areaId: user?.areaId,
    })
  }

  @Get('visit/:visitId')
  @ApiOperation({ summary: 'List prescriptions by visit' })
  async getByVisit(@Param('visitId') visitId: number, @AuthUser() user: IAuthUser) {
    return this.rxService.getByVisit(Number(visitId), user)
  }

  @Get('templates')
  @ApiOperation({ summary: 'Prescription template list' })
  async listTemplates(@Query() dto: QueryPrescriptionTemplateDto, @AuthUser() user: IAuthUser) {
    return this.rxService.listTemplates(dto, user)
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create prescription template' })
  async createTemplate(@Body() dto: CreatePrescriptionTemplateDto, @AuthUser() user: IAuthUser) {
    return this.rxService.createTemplate(dto, user)
  }

  @Get('templates/:templateId')
  @ApiOperation({ summary: 'Prescription template detail' })
  async getTemplate(@Param('templateId') templateId: number, @AuthUser() user: IAuthUser) {
    return this.rxService.getTemplate(Number(templateId), user)
  }

  @Put('templates/:templateId')
  @ApiOperation({ summary: 'Update prescription template' })
  async updateTemplate(@Param('templateId') templateId: number, @Body() dto: UpdatePrescriptionTemplateDto, @AuthUser() user: IAuthUser) {
    return this.rxService.updateTemplate(Number(templateId), dto, user)
  }

  @Post('templates/:templateId/delete')
  @ApiOperation({ summary: 'Delete prescription template' })
  async deleteTemplate(@Param('templateId') templateId: number, @AuthUser() user: IAuthUser) {
    await this.rxService.deleteTemplate(Number(templateId), user)
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit prescription for review' })
  async submit(@IdParam() id: number, @AuthUser() user: IAuthUser) {
    await this.rxService.submitForReview(id, user)
  }

  @Put(':id/review')
  @ApiOperation({ summary: 'Review prescription' })
  async review(@IdParam() id: number, @Body() dto: ReviewPrescriptionDto, @AuthUser() user: IAuthUser) {
    await this.rxService.reviewRx(id, dto, {
      currentUserId: user?.uid,
      tenantId: user?.tenantId,
      areaId: user?.areaId,
    })
  }

  @Post(':id/dispense')
  @ApiOperation({ summary: 'Dispense prescription' })
  async dispense(@IdParam() id: number, @Body() dto: DispensePrescriptionDto, @AuthUser() user: IAuthUser) {
    return this.rxService.dispenseRx(id, dto, {
      currentUserId: user?.uid,
      tenantId: user?.tenantId,
      areaId: user?.areaId,
    })
  }

  @Get(':id/stock-txns')
  @ApiOperation({ summary: 'Prescription stock transactions' })
  async stockTxns(@IdParam() id: number, @AuthUser() user: IAuthUser) {
    return this.rxService.getStockTransactions(id, user)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Prescription detail' })
  @ApiResult({ type: PrescriptionEntity })
  async get(@IdParam() id: number, @AuthUser() user: IAuthUser) {
    return this.rxService.getDetail(id, user)
  }
}
