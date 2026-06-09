import { Controller, Get, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { ReportService } from './report.service'

@ApiTags('VPet - Report')
@Controller('vpet/report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('daily')
  @ApiOperation({ summary: 'Daily business report' })
  async daily(@Query('date') date?: string) {
    return this.reportService.getDailySummary(date)
  }

  @Get('chronic')
  @ApiOperation({ summary: 'Chronic management summary' })
  async chronic() {
    return this.reportService.getChronicSummary()
  }
}
