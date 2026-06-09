import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { IdParam } from '~/common/decorators/id-param.decorator'
import { CreateLabOrderDto, CreateLabTemplateDto, QueryLabOrderDto, SubmitLisOrderDto, UpdateLabReportDto, UpdateLabTemplateDto } from './dto/lab.dto'
import { LabService } from './lab.service'

@ApiTags('VPet - Lab')
@Controller('vpet/lab')
export class LabController {
  constructor(private readonly labService: LabService) {}

  @Get()
  @ApiOperation({ summary: 'Lab order list' })
  async list(@Query() dto: QueryLabOrderDto) {
    return this.labService.list(dto)
  }

  @Post()
  @ApiOperation({ summary: 'Create lab order' })
  async create(@Body() dto: CreateLabOrderDto) {
    return this.labService.create(dto)
  }

  @Get('templates')
  @ApiOperation({ summary: 'Lab template list' })
  async listTemplates() {
    return this.labService.listTemplates()
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create lab template' })
  async createTemplate(@Body() dto: CreateLabTemplateDto) {
    return this.labService.createTemplate(dto)
  }

  @Put('templates/:id')
  @ApiOperation({ summary: 'Update lab template' })
  async updateTemplate(@IdParam() id: number, @Body() dto: UpdateLabTemplateDto) {
    return this.labService.updateTemplate(id, dto)
  }

  @Delete('templates/:id')
  @ApiOperation({ summary: 'Disable lab template' })
  async disableTemplate(@IdParam() id: number) {
    return this.labService.disableTemplate(id)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lab order detail' })
  async get(@IdParam() id: number) {
    return this.labService.getDetail(id)
  }

  @Put(':id/report')
  @ApiOperation({ summary: 'Save lab report' })
  async saveReport(@IdParam() id: number, @Body() dto: UpdateLabReportDto) {
    return this.labService.saveReport(id, dto)
  }

  @Post(':id/lis')
  @ApiOperation({ summary: 'Submit LIS order' })
  async submitLisOrder(@Param('id') id: number, @Body() dto: SubmitLisOrderDto) {
    return this.labService.submitLisOrder(Number(id), dto)
  }
}
