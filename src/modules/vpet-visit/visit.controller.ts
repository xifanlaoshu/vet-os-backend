import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { ApiResult } from '~/common/decorators/api-result.decorator'
import { IdParam } from '~/common/decorators/id-param.decorator'
import {
  CreateChronicCaseDto,
  CreateChronicFollowupDto,
  CreateDiagnosisCodeDto,
  CreateVisitCareFollowupDto,
  CreateVisitDto,
  LockEmrDto,
  QueryDiagnosisCodeDto,
  QueryVisitDto,
  RequestUnlockEmrDto,
  ReviewUnlockEmrDto,
  SignEmrDto,
  UpdateDiagnosisCodeDto,
  UpdateVisitDto,
} from './dto/visit.dto'
import { VisitEntity } from './entities/visit.entity'
import { VisitService } from './visit.service'

@ApiTags('VPet - 就诊管理')
@Controller('vpet/visit')
export class VisitController {
  constructor(private readonly visitService: VisitService) {}

  @Post()
  @ApiOperation({ summary: '创建就诊(挂号)' })
  @ApiResult({ type: VisitEntity })
  async create(@Body() dto: CreateVisitDto) {
    return this.visitService.createVisit(dto)
  }

  @Get()
  @ApiOperation({ summary: '就诊列表' })
  @ApiResult({ type: [VisitEntity], isPage: true })
  async list(@Query() dto: QueryVisitDto) {
    return this.visitService.queryList(dto)
  }

  @Get('queue')
  @ApiOperation({ summary: '今日候诊队列' })
  async getQueue(@Query('doctorId') doctorId?: number) {
    return this.visitService.getTodayQueue(doctorId)
  }

  @Get('diagnosis-codes')
  @ApiOperation({ summary: 'Diagnosis code master data' })
  async searchDiagnosisCodes(
    @Query('keyword') keyword?: string,
    @Query('species') species?: string,
  ) {
    return this.visitService.searchDiagnosisCodes({ keyword, species })
  }

  @Get('diagnosis-codes/page')
  @ApiOperation({ summary: 'Diagnosis code master data page' })
  async listDiagnosisCodes(@Query() dto: QueryDiagnosisCodeDto) {
    return this.visitService.listDiagnosisCodes(dto)
  }

  @Post('diagnosis-codes')
  @ApiOperation({ summary: 'Create diagnosis master data' })
  async createDiagnosisCode(@Body() dto: CreateDiagnosisCodeDto) {
    return this.visitService.createDiagnosisCode(dto)
  }

  @Put('diagnosis-codes/:code')
  @ApiOperation({ summary: 'Update diagnosis master data' })
  async updateDiagnosisCode(@Param('code') code: string, @Body() dto: UpdateDiagnosisCodeDto) {
    return this.visitService.updateDiagnosisCode(String(code), dto)
  }

  @Delete('diagnosis-codes/:code')
  @ApiOperation({ summary: 'Delete diagnosis master data' })
  async deleteDiagnosisCode(@Param('code') code: string) {
    return this.visitService.deleteDiagnosisCode(String(code))
  }

  @Get('unlock-requests')
  @ApiOperation({ summary: 'EMR unlock request list' })
  async listUnlockRequests(
    @Query('visitId') visitId?: number,
    @Query('status') status?: number,
  ) {
    return this.visitService.listUnlockRequests({
      visitId: visitId ? Number(visitId) : undefined,
      status: status !== undefined ? Number(status) : undefined,
    })
  }

  @Post('unlock-requests/:id/review')
  @ApiOperation({ summary: 'Review EMR unlock request' })
  async reviewUnlockRequest(@IdParam() id: number, @Body() dto: ReviewUnlockEmrDto) {
    return this.visitService.reviewUnlockRequest(id, dto)
  }

  @Get(':id')
  @ApiOperation({ summary: '就诊详情' })
  @ApiResult({ type: VisitEntity })
  async get(@IdParam() id: number) {
    return this.visitService.findOneDetailed(id)
  }

  @Get(':id/care-followups')
  @ApiOperation({ summary: '就诊持续诊疗跟进记录' })
  async listCareFollowups(@IdParam() id: number) {
    return this.visitService.listVisitCareFollowups(id)
  }

  @Post(':id/care-followups')
  @ApiOperation({ summary: '新增就诊持续诊疗跟进记录' })
  async createCareFollowup(@IdParam() id: number, @Body() dto: CreateVisitCareFollowupDto) {
    return this.visitService.createVisitCareFollowup(id, dto)
  }

  @Put(':id')
  @ApiOperation({ summary: '更新就诊(保存SOAP等)' })
  async update(@IdParam() id: number, @Body() dto: UpdateVisitDto) {
    await this.visitService.saveSoap(id, dto)
  }

  @Post(':id/lock')
  @ApiOperation({ summary: 'Lock EMR' })
  async lockEmr(@IdParam() id: number, @Body() dto: LockEmrDto) {
    return this.visitService.lockEmr(id, dto)
  }

  @Post(':id/unlock-request')
  @ApiOperation({ summary: 'Request EMR unlock' })
  async requestUnlock(@IdParam() id: number, @Body() dto: RequestUnlockEmrDto) {
    return this.visitService.requestUnlockEmr(id, dto)
  }

  @Post(':id/sign')
  @ApiOperation({ summary: 'Sign EMR' })
  async signEmr(@IdParam() id: number, @Body() dto: SignEmrDto) {
    return this.visitService.signEmr(id, dto)
  }

  @Get(':id/audit-logs')
  @ApiOperation({ summary: 'EMR audit logs' })
  async auditLogs(@IdParam() id: number) {
    return this.visitService.listEmrAuditLogs(id)
  }

  @Get(':id/signatures')
  @ApiOperation({ summary: 'EMR signatures' })
  async signatures(@IdParam() id: number) {
    return this.visitService.listSignatures(id)
  }

  @Post(':id/start')
  @ApiOperation({ summary: '开始接诊' })
  async start(@IdParam() id: number) {
    return this.visitService.startConsultation(id)
  }

  @Post(':id/end')
  @ApiOperation({ summary: '结束就诊' })
  async end(@IdParam() id: number) {
    await this.visitService.endConsultation(id)
  }

  @Get('chronic/cases')
  @ApiOperation({ summary: 'Chronic cases list' })
  async listChronicCases(
    @Query('petId') petId?: number,
    @Query('customerId') customerId?: number,
    @Query('status') status?: number,
    @Query('keyword') keyword?: string,
  ) {
    return this.visitService.listChronicCases({
      petId: petId ? Number(petId) : undefined,
      customerId: customerId ? Number(customerId) : undefined,
      status: status !== undefined ? Number(status) : undefined,
      keyword,
    })
  }

  @Post('chronic/cases')
  @ApiOperation({ summary: 'Create chronic case' })
  async createChronicCase(@Body() dto: CreateChronicCaseDto) {
    return this.visitService.createChronicCase(dto)
  }

  @Get('chronic/cases/:id')
  @ApiOperation({ summary: 'Chronic case detail' })
  async getChronicCase(@IdParam() id: number) {
    return this.visitService.getChronicCaseDetail(id)
  }

  @Post('chronic/cases/:id/followups')
  @ApiOperation({ summary: 'Add chronic followup' })
  async addChronicFollowup(@IdParam() id: number, @Body() dto: CreateChronicFollowupDto) {
    return this.visitService.addChronicFollowup(id, dto)
  }

  @Get('chronic/cases/:id/report')
  @ApiOperation({ summary: 'Chronic report' })
  async getChronicReport(@IdParam() id: number) {
    return this.visitService.getChronicReport(id)
  }
}
