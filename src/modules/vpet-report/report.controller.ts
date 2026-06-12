import { Controller, Get, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { AuthUser } from '~/modules/auth/decorators/auth-user.decorator'
import { ReportService } from './report.service'

@ApiTags('VPet - Report')
@Controller('vpet/report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('daily')
  @ApiOperation({ summary: 'Daily business report' })
  async daily(@Query('date') date: string | undefined, @AuthUser() user: IAuthUser) {
    return this.reportService.getDailySummary(date, user)
  }

  @Get('chronic')
  @ApiOperation({ summary: 'Chronic management summary' })
  async chronic(@AuthUser() user: IAuthUser) {
    return this.reportService.getChronicSummary(user)
  }
}
