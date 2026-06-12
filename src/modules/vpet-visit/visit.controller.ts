import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { ApiResult } from '~/common/decorators/api-result.decorator'
import { IdParam } from '~/common/decorators/id-param.decorator'
import { AuthUser } from '~/modules/auth/decorators/auth-user.decorator'
import {
  CreateChronicCaseDto,
  CreateChronicFollowupDto,
  CreateDiagnosisCodeDto,
  CreateVisitCareFollowupDto,
  CreateVisitDto,
  CreateVisitMediaBatchDto,
  CreateVisitMediaFileDto,
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
  async create(@Body() dto: CreateVisitDto, @AuthUser() user: IAuthUser) {
    return this.visitService.createVisit({
      ...dto,
      tenantId: user?.tenantId,
      areaId: user?.areaId,
    } as any)
  }

  @Get()
  @ApiOperation({ summary: '就诊列表' })
  @ApiResult({ type: [VisitEntity], isPage: true })
  async list(@Query() dto: QueryVisitDto, @AuthUser() user: IAuthUser) {
    return this.visitService.queryList(dto, user?.uid, user)
  }

  @Get('queue')
  @ApiOperation({ summary: '今日候诊队列' })
  async getQueue(
    @Query('doctorId') doctorId: number | undefined,
    @Query('scope') scope: string | undefined,
    @AuthUser() user: IAuthUser,
  ) {
    return this.visitService.getTodayQueue({
      doctorId,
      scope,
      currentUserId: user?.uid,
      tenantId: user?.tenantId,
      areaId: user?.areaId,
    })
  }

  @Get('diagnosis-codes')
  @ApiOperation({ summary: 'Diagnosis code master data' })
  async searchDiagnosisCodes(
    @Query('keyword') keyword?: string,
    @Query('species') species?: string,
    @AuthUser() user?: IAuthUser,
  ) {
    return this.visitService.searchDiagnosisCodes({ keyword, species }, user)
  }

  @Get('diagnosis-codes/page')
  @ApiOperation({ summary: 'Diagnosis code master data page' })
  async listDiagnosisCodes(@Query() dto: QueryDiagnosisCodeDto, @AuthUser() user: IAuthUser) {
    return this.visitService.listDiagnosisCodes(dto, user)
  }

  @Post('diagnosis-codes')
  @ApiOperation({ summary: 'Create diagnosis master data' })
  async createDiagnosisCode(@Body() dto: CreateDiagnosisCodeDto, @AuthUser() user: IAuthUser) {
    return this.visitService.createDiagnosisCode(dto, user)
  }

  @Put('diagnosis-codes/:code')
  @ApiOperation({ summary: 'Update diagnosis master data' })
  async updateDiagnosisCode(@Param('code') code: string, @Body() dto: UpdateDiagnosisCodeDto, @AuthUser() user: IAuthUser) {
    return this.visitService.updateDiagnosisCode(String(code), dto, user)
  }

  @Delete('diagnosis-codes/:code')
  @ApiOperation({ summary: 'Delete diagnosis master data' })
  async deleteDiagnosisCode(@Param('code') code: string, @AuthUser() user: IAuthUser) {
    return this.visitService.deleteDiagnosisCode(String(code), user)
  }

  @Get('unlock-requests')
  @ApiOperation({ summary: 'EMR unlock request list' })
  async listUnlockRequests(
    @Query('visitId') visitId?: number,
    @Query('status') status?: number,
    @AuthUser() user?: IAuthUser,
  ) {
    return this.visitService.listUnlockRequests({
      visitId: visitId ? Number(visitId) : undefined,
      status: status !== undefined ? Number(status) : undefined,
    }, user)
  }

  @Post('unlock-requests/:id/review')
  @ApiOperation({ summary: 'Review EMR unlock request' })
  async reviewUnlockRequest(@IdParam() id: number, @Body() dto: ReviewUnlockEmrDto, @AuthUser() user: IAuthUser) {
    return this.visitService.reviewUnlockRequest(id, dto, { tenantId: user?.tenantId, areaId: user?.areaId, currentUserId: user?.uid })
  }

  @Get(':id')
  @ApiOperation({ summary: '就诊详情' })
  @ApiResult({ type: VisitEntity })
  async get(
    @IdParam() id: number,
    @Query('scope') scope: string | undefined,
    @AuthUser() user: IAuthUser,
  ) {
    return this.visitService.findOneDetailed(id, {
      scope,
      currentUserId: user?.uid,
      tenantId: user?.tenantId,
      areaId: user?.areaId,
    })
  }

  @Get(':id/care-followups')
  @ApiOperation({ summary: '就诊持续诊疗跟进记录' })
  async listCareFollowups(
    @IdParam() id: number,
    @Query('scope') scope: string | undefined,
    @AuthUser() user: IAuthUser,
  ) {
    return this.visitService.listVisitCareFollowups(id, { scope, currentUserId: user?.uid, tenantId: user?.tenantId, areaId: user?.areaId })
  }

  @Post(':id/care-followups')
  @ApiOperation({ summary: '新增就诊持续诊疗跟进记录' })
  async createCareFollowup(
    @IdParam() id: number,
    @Body() dto: CreateVisitCareFollowupDto,
    @Query('scope') scope: string | undefined,
    @AuthUser() user: IAuthUser,
  ) {
    return this.visitService.createVisitCareFollowup(id, dto, { scope, currentUserId: user?.uid, tenantId: user?.tenantId, areaId: user?.areaId })
  }

  @Get(':id/media-batches')
  @ApiOperation({ summary: 'Visit media capture batches' })
  async listMediaBatches(
    @IdParam() id: number,
    @Query('scope') scope: string | undefined,
    @AuthUser() user: IAuthUser,
  ) {
    return this.visitService.listVisitMediaBatches(id, { scope, currentUserId: user?.uid, tenantId: user?.tenantId, areaId: user?.areaId })
  }

  @Post(':id/media-batches')
  @ApiOperation({ summary: 'Create visit media capture batch' })
  async createMediaBatch(
    @IdParam() id: number,
    @Body() dto: CreateVisitMediaBatchDto,
    @Query('scope') scope: string | undefined,
    @AuthUser() user: IAuthUser,
  ) {
    return this.visitService.createVisitMediaBatch(id, dto, { scope, currentUserId: user?.uid, tenantId: user?.tenantId, areaId: user?.areaId })
  }

  @Post(':id/media-batches/:batchId/files')
  @ApiOperation({ summary: 'Add media file to visit media batch' })
  async createMediaFile(
    @IdParam() id: number,
    @Param('batchId') batchId: string,
    @Body() dto: CreateVisitMediaFileDto,
    @Query('scope') scope: string | undefined,
    @AuthUser() user: IAuthUser,
  ) {
    return this.visitService.createVisitMediaFile(id, Number(batchId), dto, { scope, currentUserId: user?.uid, tenantId: user?.tenantId, areaId: user?.areaId })
  }

  @Put(':id')
  @ApiOperation({ summary: '更新就诊(保存SOAP等)' })
  async update(
    @IdParam() id: number,
    @Body() dto: UpdateVisitDto,
    @Query('scope') scope: string | undefined,
    @AuthUser() user: IAuthUser,
  ) {
    await this.visitService.saveSoap(id, dto, { scope, currentUserId: user?.uid, tenantId: user?.tenantId, areaId: user?.areaId })
  }

  @Post(':id/lock')
  @ApiOperation({ summary: 'Lock EMR' })
  async lockEmr(
    @IdParam() id: number,
    @Body() dto: LockEmrDto,
    @Query('scope') scope: string | undefined,
    @AuthUser() user: IAuthUser,
  ) {
    return this.visitService.lockEmr(id, dto, { scope, currentUserId: user?.uid, tenantId: user?.tenantId, areaId: user?.areaId })
  }

  @Post(':id/unlock-request')
  @ApiOperation({ summary: 'Request EMR unlock' })
  async requestUnlock(
    @IdParam() id: number,
    @Body() dto: RequestUnlockEmrDto,
    @Query('scope') scope: string | undefined,
    @AuthUser() user: IAuthUser,
  ) {
    return this.visitService.requestUnlockEmr(id, dto, { scope, currentUserId: user?.uid, tenantId: user?.tenantId, areaId: user?.areaId })
  }

  @Post(':id/sign')
  @ApiOperation({ summary: 'Sign EMR' })
  async signEmr(
    @IdParam() id: number,
    @Body() dto: SignEmrDto,
    @Query('scope') scope: string | undefined,
    @AuthUser() user: IAuthUser,
  ) {
    return this.visitService.signEmr(id, dto, { scope, currentUserId: user?.uid, tenantId: user?.tenantId, areaId: user?.areaId })
  }

  @Get(':id/audit-logs')
  @ApiOperation({ summary: 'EMR audit logs' })
  async auditLogs(
    @IdParam() id: number,
    @Query('scope') scope: string | undefined,
    @AuthUser() user: IAuthUser,
  ) {
    return this.visitService.listEmrAuditLogs(id, { scope, currentUserId: user?.uid, tenantId: user?.tenantId, areaId: user?.areaId })
  }

  @Get(':id/signatures')
  @ApiOperation({ summary: 'EMR signatures' })
  async signatures(
    @IdParam() id: number,
    @Query('scope') scope: string | undefined,
    @AuthUser() user: IAuthUser,
  ) {
    return this.visitService.listSignatures(id, { scope, currentUserId: user?.uid, tenantId: user?.tenantId, areaId: user?.areaId })
  }

  @Post(':id/start')
  @ApiOperation({ summary: '开始接诊' })
  async start(
    @IdParam() id: number,
    @Query('scope') scope: string | undefined,
    @AuthUser() user: IAuthUser,
  ) {
    return this.visitService.startConsultation(id, { scope, currentUserId: user?.uid, tenantId: user?.tenantId, areaId: user?.areaId })
  }

  @Post(':id/end')
  @ApiOperation({ summary: '结束就诊' })
  async end(
    @IdParam() id: number,
    @Query('scope') scope: string | undefined,
    @AuthUser() user: IAuthUser,
  ) {
    await this.visitService.endConsultation(id, { scope, currentUserId: user?.uid, tenantId: user?.tenantId, areaId: user?.areaId })
  }

  @Get('chronic/cases')
  @ApiOperation({ summary: 'Chronic cases list' })
  async listChronicCases(
    @Query('petId') petId?: number,
    @Query('customerId') customerId?: number,
    @Query('status') status?: number,
    @Query('keyword') keyword?: string,
    @AuthUser() user?: IAuthUser,
  ) {
    return this.visitService.listChronicCases({
      petId: petId ? Number(petId) : undefined,
      customerId: customerId ? Number(customerId) : undefined,
      status: status !== undefined ? Number(status) : undefined,
      keyword,
    }, user)
  }

  @Post('chronic/cases')
  @ApiOperation({ summary: 'Create chronic case' })
  async createChronicCase(@Body() dto: CreateChronicCaseDto, @AuthUser() user: IAuthUser) {
    return this.visitService.createChronicCase(dto, user)
  }

  @Get('chronic/cases/:id')
  @ApiOperation({ summary: 'Chronic case detail' })
  async getChronicCase(@IdParam() id: number, @AuthUser() user: IAuthUser) {
    return this.visitService.getChronicCaseDetail(id, user)
  }

  @Post('chronic/cases/:id/followups')
  @ApiOperation({ summary: 'Add chronic followup' })
  async addChronicFollowup(@IdParam() id: number, @Body() dto: CreateChronicFollowupDto, @AuthUser() user: IAuthUser) {
    return this.visitService.addChronicFollowup(id, dto, user)
  }

  @Get('chronic/cases/:id/report')
  @ApiOperation({ summary: 'Chronic report' })
  async getChronicReport(@IdParam() id: number, @AuthUser() user: IAuthUser) {
    return this.visitService.getChronicReport(id, user)
  }
}
