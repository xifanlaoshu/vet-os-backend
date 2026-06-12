import { Body, Controller, Delete, Get, Post, Put, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { IdParam } from '~/common/decorators/id-param.decorator'
import { AuthUser } from '~/modules/auth/decorators/auth-user.decorator'
import { Perm } from '~/modules/auth/decorators/permission.decorator'
import { AppointmentService } from './appointment.service'
import { CreateAppointmentDto, UpdateAppointmentDto } from './dto/appointment.dto'
import { CreateDoctorDto, QueryDoctorDto, UpdateDoctorDto } from './dto/doctor.dto'
import { CreateShiftDto, QueryShiftDto, QueryStaffScheduleDto, SaveStaffScheduleDto, UpdateShiftDto } from './dto/shift.dto'

@ApiTags('VPet - 预约挂号')
@Perm('vpet:appointment')
@Controller('vpet/appointment')
export class AppointmentController {
  constructor(private readonly apptService: AppointmentService) {}

  // ---- 挂号管理 ----
  @Get()
  @ApiOperation({ summary: '预约列表' })
  async list(@Query() params: any, @AuthUser() user: IAuthUser) {
    return this.apptService.list(params, user?.uid, user)
  }

  @Post()
  @ApiOperation({ summary: '新增预约' })
  async create(@Body() dto: CreateAppointmentDto, @AuthUser() user: IAuthUser) {
    return this.apptService.create(dto, user)
  }

  @Put(':id')
  @ApiOperation({ summary: '更新预约' })
  async update(@IdParam() id: number, @Body() dto: UpdateAppointmentDto, @AuthUser() user: IAuthUser) {
    await this.apptService.update(id, dto, user)
  }

  @Post(':id/checkin')
  @ApiOperation({ summary: '签到' })
  async checkin(
    @IdParam() id: number,
    @Query('scope') scope: string | undefined,
    @AuthUser() user: IAuthUser,
  ) {
    return this.apptService.checkin(id, {
      scope,
      currentUserId: user?.uid,
      tenantId: user?.tenantId,
      areaId: user?.areaId,
    })
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: '取消预约' })
  async cancel(@IdParam() id: number, @AuthUser() user: IAuthUser) {
    await this.apptService.cancel(id, user)
  }

  // ---- 医护人员管理 ----
  @Get('doctors')
  @ApiOperation({ summary: '医护人员列表' })
  async doctorList(@Query() dto: QueryDoctorDto, @AuthUser() user: IAuthUser) {
    return this.apptService.doctorList(dto, user)
  }

  @Get('doctors/all')
  @ApiOperation({ summary: '所有医护人员(不分页)' })
  async getAllDoctors(@Query('bookableOnly') bookableOnly?: string, @AuthUser() user?: IAuthUser) {
    return this.apptService.getDoctors(bookableOnly === '1' || bookableOnly === 'true', user)
  }

  @Post('doctors')
  @ApiOperation({ summary: '新增医护人员' })
  async createDoctor(@Body() dto: CreateDoctorDto, @AuthUser() user: IAuthUser) {
    return this.apptService.createDoctor(dto, user)
  }

  @Put('doctors/:id')
  @ApiOperation({ summary: '更新医护人员' })
  async updateDoctor(@IdParam() id: number, @Body() dto: UpdateDoctorDto, @AuthUser() user: IAuthUser) {
    await this.apptService.updateDoctor(id, dto, user)
  }

  @Delete('doctors/:id')
  @ApiOperation({ summary: '删除医护人员' })
  async deleteDoctor(@IdParam() id: number, @AuthUser() user: IAuthUser) {
    await this.apptService.deleteDoctor(id, user)
  }

  // ---- 班次管理 ----
  @Get('shifts')
  @ApiOperation({ summary: '班次列表' })
  async shiftList(@Query() dto: QueryShiftDto, @AuthUser() user: IAuthUser) {
    return this.apptService.shiftList(dto, user)
  }

  @Get('shifts/active')
  @ApiOperation({ summary: '启用班次' })
  async activeShifts(@AuthUser() user: IAuthUser) {
    return this.apptService.getActiveShifts(user)
  }

  @Post('shifts')
  @ApiOperation({ summary: '新增班次' })
  async createShift(@Body() dto: CreateShiftDto, @AuthUser() user: IAuthUser) {
    return this.apptService.createShift(dto, user)
  }

  @Put('shifts/:id')
  @ApiOperation({ summary: '更新班次' })
  async updateShift(@IdParam() id: number, @Body() dto: UpdateShiftDto, @AuthUser() user: IAuthUser) {
    await this.apptService.updateShift(id, dto, user)
  }

  @Delete('shifts/:id')
  @ApiOperation({ summary: '删除班次' })
  async deleteShift(@IdParam() id: number, @AuthUser() user: IAuthUser) {
    await this.apptService.deleteShift(id, user)
  }

  // ---- 排班管理 ----
  @Get('schedules/month')
  @ApiOperation({ summary: '月度排班' })
  async monthSchedules(@Query() dto: QueryStaffScheduleDto, @AuthUser() user: IAuthUser) {
    return this.apptService.monthSchedules(dto, user)
  }

  @Post('schedules')
  @ApiOperation({ summary: '保存单日排班' })
  async saveStaffSchedule(@Body() dto: SaveStaffScheduleDto, @AuthUser() user: IAuthUser) {
    return this.apptService.saveStaffSchedule(dto, user)
  }
}
