import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { IdParam } from '~/common/decorators/id-param.decorator'
import { AuthUser } from '~/modules/auth/decorators/auth-user.decorator'
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
  async list(@Query() dto: QueryHospitalizationDto, @AuthUser() user: IAuthUser) {
    return this.hospitalizationService.list(dto, user)
  }

  @Post()
  @ApiOperation({ summary: 'Create hospitalization' })
  async create(@Body() dto: CreateHospitalizationDto, @AuthUser() user: IAuthUser) {
    return this.hospitalizationService.create(dto, user)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Hospitalization detail' })
  async get(@IdParam() id: number, @AuthUser() user: IAuthUser) {
    return this.hospitalizationService.getDetail(id, user)
  }

  @Get(':id/nursing')
  @ApiOperation({ summary: 'Hospitalization nursing plans' })
  async getPlans(@Param('id') id: number, @AuthUser() user: IAuthUser) {
    return this.hospitalizationService.listPlans(Number(id), user)
  }

  @Post(':id/nursing')
  @ApiOperation({ summary: 'Create nursing plan' })
  async createPlan(@Param('id') id: number, @Body() dto: CreateNursingPlanDto, @AuthUser() user: IAuthUser) {
    return this.hospitalizationService.createPlan(Number(id), dto, user)
  }

  @Post('nursing/:planId/execute')
  @ApiOperation({ summary: 'Execute nursing plan' })
  async executePlan(@Param('planId') planId: number, @Body() dto: ExecuteNursingPlanDto, @AuthUser() user: IAuthUser) {
    return this.hospitalizationService.executePlan(Number(planId), dto, user)
  }

  @Post(':id/discharge')
  @ApiOperation({ summary: 'Discharge hospitalization' })
  async discharge(@Param('id') id: number, @Body() dto: DischargeHospitalizationDto, @AuthUser() user: IAuthUser) {
    return this.hospitalizationService.discharge(Number(id), dto, user)
  }
}
