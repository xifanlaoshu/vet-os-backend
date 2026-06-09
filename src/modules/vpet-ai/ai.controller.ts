import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { AiService } from './ai.service'
import { LabInterpretDto, QueryAiLogDto, SoapDraftDto } from './dto/ai.dto'

@ApiTags('VPet - AI')
@Controller('vpet/ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('soap-draft')
  @ApiOperation({ summary: 'Generate SOAP draft' })
  async soapDraft(@Body() dto: SoapDraftDto) {
    return this.aiService.generateSoapDraft(dto)
  }

  @Post('lab-interpret')
  @ApiOperation({ summary: 'Interpret lab report' })
  async labInterpret(@Body() dto: LabInterpretDto) {
    return this.aiService.interpretLab(dto)
  }

  @Post('prescription-review/:id')
  @ApiOperation({ summary: 'Review prescription safety' })
  async prescriptionReview(@Param('id') id: number) {
    return this.aiService.reviewPrescription(Number(id))
  }

  @Get('logs')
  @ApiOperation({ summary: 'AI log list' })
  async logs(@Query() dto: QueryAiLogDto) {
    return this.aiService.logList(dto)
  }
}
