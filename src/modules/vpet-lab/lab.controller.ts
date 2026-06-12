import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { IdParam } from '~/common/decorators/id-param.decorator'
import { AuthUser } from '~/modules/auth/decorators/auth-user.decorator'
import { Perm } from '~/modules/auth/decorators/permission.decorator'
import { CreateLabOrderDto, CreateLabTemplateDto, QueryLabOrderDto, SubmitLisOrderDto, UpdateLabReportDto, UpdateLabTemplateDto } from './dto/lab.dto'
import { LabService } from './lab.service'

@ApiTags('VPet - Lab')
@Perm('vpet:lab:list')
@Controller('vpet/lab')
export class LabController {
  constructor(private readonly labService: LabService) {}

  @Get()
  @ApiOperation({ summary: 'Lab order list' })
  async list(@Query() dto: QueryLabOrderDto, @AuthUser() user: IAuthUser) {
    return this.labService.list(dto, user)
  }

  @Post()
  @ApiOperation({ summary: 'Create lab order' })
  async create(@Body() dto: CreateLabOrderDto, @AuthUser() user: IAuthUser) {
    return this.labService.create(dto, user)
  }

  @Get('templates')
  @ApiOperation({ summary: 'Lab template list' })
  async listTemplates(@AuthUser() user: IAuthUser) {
    return this.labService.listTemplates(user)
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create lab template' })
  async createTemplate(@Body() dto: CreateLabTemplateDto, @AuthUser() user: IAuthUser) {
    return this.labService.createTemplate(dto, user)
  }

  @Put('templates/:id')
  @ApiOperation({ summary: 'Update lab template' })
  async updateTemplate(@IdParam() id: number, @Body() dto: UpdateLabTemplateDto, @AuthUser() user: IAuthUser) {
    return this.labService.updateTemplate(id, dto, user)
  }

  @Delete('templates/:id')
  @ApiOperation({ summary: 'Disable lab template' })
  async disableTemplate(@IdParam() id: number, @AuthUser() user: IAuthUser) {
    return this.labService.disableTemplate(id, user)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lab order detail' })
  async get(@IdParam() id: number, @AuthUser() user: IAuthUser) {
    return this.labService.getDetail(id, user)
  }

  @Put(':id/report')
  @ApiOperation({ summary: 'Save lab report' })
  async saveReport(@IdParam() id: number, @Body() dto: UpdateLabReportDto, @AuthUser() user: IAuthUser) {
    return this.labService.saveReport(id, dto, user)
  }

  @Post(':id/lis')
  @ApiOperation({ summary: 'Submit LIS order' })
  async submitLisOrder(@Param('id') id: number, @Body() dto: SubmitLisOrderDto, @AuthUser() user: IAuthUser) {
    return this.labService.submitLisOrder(Number(id), dto, user)
  }
}
