import { Body, Controller, Get, Post, Put, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { IdParam } from '~/common/decorators/id-param.decorator'
import { CreateReminderDto, QueryReminderDto, UpdateReminderDto } from './dto/reminder.dto'
import { ReminderService } from './reminder.service'

@ApiTags('VPet - Reminder')
@Controller('vpet/reminder')
export class ReminderController {
  constructor(private readonly reminderService: ReminderService) {}

  @Get()
  @ApiOperation({ summary: 'Reminder list' })
  async list(@Query() dto: QueryReminderDto) {
    return this.reminderService.list(dto)
  }

  @Post()
  @ApiOperation({ summary: 'Create reminder' })
  async create(@Body() dto: CreateReminderDto) {
    return this.reminderService.create(dto)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update reminder' })
  async update(@IdParam() id: number, @Body() dto: UpdateReminderDto) {
    return this.reminderService.update(id, dto)
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete reminder' })
  async complete(@IdParam() id: number) {
    return this.reminderService.complete(id)
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel reminder' })
  async cancel(@IdParam() id: number) {
    return this.reminderService.cancel(id)
  }
}
