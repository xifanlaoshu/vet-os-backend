import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { IdParam } from '~/common/decorators/id-param.decorator'
import {
  CreateHospitalizationDto,
  CreateNursingPlanDto,
  DischargeHospitalizationDto,
  ExecuteNursingPlanDto,
  QueryHospitalizationDto,
} from './dto/hospitalization.dto'
import { HospitalizationService } from './hospitalization.service'

@ApiTags('VPet - Hospitalization')
@Controller('vpet/hosp')
export class HospitalizationController {
  constructor(private readonly hospitalizationService: HospitalizationService) {}

  @Get()
  @ApiOperation({ summary: 'Hospitalization list' })
  async list(@Query() dto: QueryHospitalizationDto) {
    return this.hospitalizationService.list(dto)
  }

  @Post()
  @ApiOperation({ summary: 'Create hospitalization' })
  async create(@Body() dto: CreateHospitalizationDto) {
    return this.hospitalizationService.create(dto)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Hospitalization detail' })
  async get(@IdParam() id: number) {
    return this.hospitalizationService.getDetail(id)
  }

  @Get(':id/nursing')
  @ApiOperation({ summary: 'Hospitalization nursing plans' })
  async getPlans(@Param('id') id: number) {
    return this.hospitalizationService.listPlans(Number(id))
  }

  @Post(':id/nursing')
  @ApiOperation({ summary: 'Create nursing plan' })
  async createPlan(@Param('id') id: number, @Body() dto: CreateNursingPlanDto) {
    return this.hospitalizationService.createPlan(Number(id), dto)
  }

  @Post('nursing/:planId/execute')
  @ApiOperation({ summary: 'Execute nursing plan' })
  async executePlan(@Param('planId') planId: number, @Body() dto: ExecuteNursingPlanDto) {
    return this.hospitalizationService.executePlan(Number(planId), dto)
  }

  @Post(':id/discharge')
  @ApiOperation({ summary: 'Discharge hospitalization' })
  async discharge(@Param('id') id: number, @Body() dto: DischargeHospitalizationDto) {
    return this.hospitalizationService.discharge(Number(id), dto)
  }
}
