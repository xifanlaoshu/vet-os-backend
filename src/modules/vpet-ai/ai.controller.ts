import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { AuthUser } from '~/modules/auth/decorators/auth-user.decorator'
import { Perm } from '~/modules/auth/decorators/permission.decorator'
import { AiService } from './ai.service'
import { LabInterpretDto, QueryAiLogDto, SoapDraftDto } from './dto/ai.dto'

@ApiTags('VPet - AI')
@Perm('vpet:ai')
@Controller('vpet/ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('soap-draft')
  @ApiOperation({ summary: 'Generate SOAP draft' })
  async soapDraft(@Body() dto: SoapDraftDto, @AuthUser() user: IAuthUser) {
    return this.aiService.generateSoapDraft(dto, user)
  }

  @Post('lab-interpret')
  @ApiOperation({ summary: 'Interpret lab report' })
  async labInterpret(@Body() dto: LabInterpretDto, @AuthUser() user: IAuthUser) {
    return this.aiService.interpretLab(dto, user)
  }

  @Post('prescription-review/:id')
  @ApiOperation({ summary: 'Review prescription safety' })
  async prescriptionReview(@Param('id') id: number, @AuthUser() user: IAuthUser) {
    return this.aiService.reviewPrescription(Number(id), user)
  }

  @Get('logs')
  @ApiOperation({ summary: 'AI log list' })
  async logs(@Query() dto: QueryAiLogDto, @AuthUser() user: IAuthUser) {
    return this.aiService.logList(dto, user)
  }
}
