import { Body, Controller, Get, Param, Post } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { IdParam } from '~/common/decorators/id-param.decorator'
import { QueueService } from './queue.service'

class QueueCallDto {
  doctorId: number
  visitId?: number
}

@ApiTags('VPet - 排队叫号')
@Controller('vpet/queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get(':doctorId')
  @ApiOperation({ summary: '获取医生候诊队列' })
  async getQueue(@Param('doctorId') doctorId: number) {
    return this.queueService.getQueue(doctorId)
  }

  @Post('call')
  @ApiOperation({ summary: '叫号' })
  async callNext(@Body() dto: QueueCallDto) {
    return this.queueService.callNext(dto.doctorId, dto.visitId)
  }

  @Post(':id/skip')
  @ApiOperation({ summary: '过号处理' })
  async skip(@IdParam() id: number) {
    return this.queueService.skip(id)
  }
}
