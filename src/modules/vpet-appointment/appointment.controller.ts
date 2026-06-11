import { Body, Controller, Delete, Get, Post, Put, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { IdParam } from '~/common/decorators/id-param.decorator'
import { AppointmentService } from './appointment.service'
import { CreateAppointmentDto, UpdateAppointmentDto } from './dto/appointment.dto'
import { CreateDoctorDto, QueryDoctorDto, UpdateDoctorDto } from './dto/doctor.dto'

@ApiTags('VPet - 预约挂号')
@Controller('vpet/appointment')
export class AppointmentController {
  constructor(private readonly apptService: AppointmentService) {}

  // ---- 挂号管理 ----
  @Get()
  @ApiOperation({ summary: '预约列表' })
  async list(@Query() params: any) {
    return this.apptService.list(params)
  }

  @Post()
  @ApiOperation({ summary: '新增预约' })
  async create(@Body() dto: CreateAppointmentDto) {
    return this.apptService.create(dto)
  }

  @Put(':id')
  @ApiOperation({ summary: '更新预约' })
  async update(@IdParam() id: number, @Body() dto: UpdateAppointmentDto) {
    await this.apptService.update(id, dto)
  }

  @Post(':id/checkin')
  @ApiOperation({ summary: '签到' })
  async checkin(@IdParam() id: number) {
    return this.apptService.checkin(id)
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: '取消预约' })
  async cancel(@IdParam() id: number) {
    await this.apptService.cancel(id)
  }

  // ---- 医护人员管理 ----
  @Get('doctors')
  @ApiOperation({ summary: '医护人员列表' })
  async doctorList(@Query() dto: QueryDoctorDto) {
    return this.apptService.doctorList(dto)
  }

  @Get('doctors/all')
  @ApiOperation({ summary: '所有医护人员(不分页)' })
  async getAllDoctors(@Query('bookableOnly') bookableOnly?: string) {
    return this.apptService.getDoctors(bookableOnly === '1' || bookableOnly === 'true')
  }

  @Post('doctors')
  @ApiOperation({ summary: '新增医护人员' })
  async createDoctor(@Body() dto: CreateDoctorDto) {
    return this.apptService.createDoctor(dto)
  }

  @Put('doctors/:id')
  @ApiOperation({ summary: '更新医护人员' })
  async updateDoctor(@IdParam() id: number, @Body() dto: UpdateDoctorDto) {
    await this.apptService.updateDoctor(id, dto)
  }

  @Delete('doctors/:id')
  @ApiOperation({ summary: '删除医护人员' })
  async deleteDoctor(@IdParam() id: number) {
    await this.apptService.deleteDoctor(id)
  }
}
