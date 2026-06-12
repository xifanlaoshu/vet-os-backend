import { Body, Controller, Get, Post, Put, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { IdParam } from '~/common/decorators/id-param.decorator'
import { AuthUser } from '~/modules/auth/decorators/auth-user.decorator'
import { CreateReminderDto, QueryReminderDto, UpdateReminderDto } from './dto/reminder.dto'
import { ReminderService } from './reminder.service'

@ApiTags('VPet - Reminder')
@Controller('vpet/reminder')
export class ReminderController {
  constructor(private readonly reminderService: ReminderService) {}

  @Get()
  @ApiOperation({ summary: 'Reminder list' })
  async list(@Query() dto: QueryReminderDto, @AuthUser() user: IAuthUser) {
    return this.reminderService.list(dto, user)
  }

  @Post()
  @ApiOperation({ summary: 'Create reminder' })
  async create(@Body() dto: CreateReminderDto, @AuthUser() user: IAuthUser) {
    return this.reminderService.create(dto, user)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update reminder' })
  async update(@IdParam() id: number, @Body() dto: UpdateReminderDto, @AuthUser() user: IAuthUser) {
    return this.reminderService.update(id, dto, user)
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete reminder' })
  async complete(@IdParam() id: number, @AuthUser() user: IAuthUser) {
    return this.reminderService.complete(id, user)
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel reminder' })
  async cancel(@IdParam() id: number, @AuthUser() user: IAuthUser) {
    return this.reminderService.cancel(id, user)
  }
}
