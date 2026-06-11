import { Body, Controller, Delete, Get, Post, Put, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { IdParam } from '~/common/decorators/id-param.decorator'
import { AuthUser } from '~/modules/auth/decorators/auth-user.decorator'
import { AppointmentService } from './appointment.service'
import { CreateAppointmentDto, UpdateAppointmentDto } from './dto/appointment.dto'
import { CreateDoctorDto, QueryDoctorDto, UpdateDoctorDto } from './dto/doctor.dto'
import { CreateShiftDto, QueryShiftDto, QueryStaffScheduleDto, SaveStaffScheduleDto, UpdateShiftDto } from './dto/shift.dto'

@ApiTags('VPet - 预约挂号')
@Controller('vpet/appointment')
export class AppointmentController {
  constructor(private readonly apptService: AppointmentService) {}

  // ---- 挂号管理 ----
  @Get()
  @ApiOperation({ summary: '预约列表' })
  async list(@Query() params: any, @AuthUser() user: IAuthUser) {
    return this.apptService.list(params, user?.uid)
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
  async checkin(
    @IdParam() id: number,
    @Query('scope') scope: string | undefined,
    @AuthUser() user: IAuthUser,
  ) {
    return this.apptService.checkin(id, { scope, currentUserId: user?.uid })
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

  // ---- 班次管理 ----
  @Get('shifts')
  @ApiOperation({ summary: '班次列表' })
  async shiftList(@Query() dto: QueryShiftDto) {
    return this.apptService.shiftList(dto)
  }

  @Get('shifts/active')
  @ApiOperation({ summary: '启用班次' })
  async activeShifts() {
    return this.apptService.getActiveShifts()
  }

  @Post('shifts')
  @ApiOperation({ summary: '新增班次' })
  async createShift(@Body() dto: CreateShiftDto) {
    return this.apptService.createShift(dto)
  }

  @Put('shifts/:id')
  @ApiOperation({ summary: '更新班次' })
  async updateShift(@IdParam() id: number, @Body() dto: UpdateShiftDto) {
    await this.apptService.updateShift(id, dto)
  }

  @Delete('shifts/:id')
  @ApiOperation({ summary: '删除班次' })
  async deleteShift(@IdParam() id: number) {
    await this.apptService.deleteShift(id)
  }

  // ---- 排班管理 ----
  @Get('schedules/month')
  @ApiOperation({ summary: '月度排班' })
  async monthSchedules(@Query() dto: QueryStaffScheduleDto) {
    return this.apptService.monthSchedules(dto)
  }

  @Post('schedules')
  @ApiOperation({ summary: '保存单日排班' })
  async saveStaffSchedule(@Body() dto: SaveStaffScheduleDto) {
    return this.apptService.saveStaffSchedule(dto)
  }
}
