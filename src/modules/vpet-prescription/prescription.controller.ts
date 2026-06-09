import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { ApiResult } from '~/common/decorators/api-result.decorator'
import { IdParam } from '~/common/decorators/id-param.decorator'
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
@Controller('vpet/prescription')
export class PrescriptionController {
  constructor(private readonly rxService: PrescriptionService) {}

  @Get()
  @ApiOperation({ summary: 'Prescription list' })
  async list(@Query() dto: QueryPrescriptionDto) {
    return this.rxService.queryList(dto)
  }

  @Post()
  @ApiOperation({ summary: 'Create prescription' })
  @ApiResult({ type: PrescriptionEntity })
  async create(@Body() dto: CreatePrescriptionDto) {
    return this.rxService.createRx(dto)
  }

  @Get('visit/:visitId')
  @ApiOperation({ summary: 'List prescriptions by visit' })
  async getByVisit(@Param('visitId') visitId: number) {
    return this.rxService.getByVisit(Number(visitId))
  }

  @Get('templates')
  @ApiOperation({ summary: 'Prescription template list' })
  async listTemplates(@Query() dto: QueryPrescriptionTemplateDto) {
    return this.rxService.listTemplates(dto)
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create prescription template' })
  async createTemplate(@Body() dto: CreatePrescriptionTemplateDto) {
    return this.rxService.createTemplate(dto)
  }

  @Get('templates/:templateId')
  @ApiOperation({ summary: 'Prescription template detail' })
  async getTemplate(@Param('templateId') templateId: number) {
    return this.rxService.getTemplate(Number(templateId))
  }

  @Put('templates/:templateId')
  @ApiOperation({ summary: 'Update prescription template' })
  async updateTemplate(@Param('templateId') templateId: number, @Body() dto: UpdatePrescriptionTemplateDto) {
    return this.rxService.updateTemplate(Number(templateId), dto)
  }

  @Post('templates/:templateId/delete')
  @ApiOperation({ summary: 'Delete prescription template' })
  async deleteTemplate(@Param('templateId') templateId: number) {
    await this.rxService.deleteTemplate(Number(templateId))
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit prescription for review' })
  async submit(@IdParam() id: number) {
    await this.rxService.submitForReview(id)
  }

  @Put(':id/review')
  @ApiOperation({ summary: 'Review prescription' })
  async review(@IdParam() id: number, @Body() dto: ReviewPrescriptionDto) {
    await this.rxService.reviewRx(id, dto)
  }

  @Post(':id/dispense')
  @ApiOperation({ summary: 'Dispense prescription' })
  async dispense(@IdParam() id: number, @Body() dto: DispensePrescriptionDto) {
    return this.rxService.dispenseRx(id, dto)
  }

  @Get(':id/stock-txns')
  @ApiOperation({ summary: 'Prescription stock transactions' })
  async stockTxns(@IdParam() id: number) {
    return this.rxService.getStockTransactions(id)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Prescription detail' })
  @ApiResult({ type: PrescriptionEntity })
  async get(@IdParam() id: number) {
    return this.rxService.getDetail(id)
  }
}
