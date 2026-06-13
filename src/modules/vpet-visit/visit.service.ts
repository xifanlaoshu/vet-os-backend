import { createHash } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Brackets, QueryFailedError, Repository } from 'typeorm'
import { BusinessException } from '~/common/exceptions/biz.exception'
import { requireTenantAreaContext, requireTenantContext } from '~/common/utils/tenant-context.util'
import { BaseService } from '~/helper/crud/base.service'
import { paginate } from '~/helper/paginate'
import { AppointmentEntity } from '../vpet-appointment/entities/appointment.entity'
import { DoctorEntity } from '../vpet-appointment/entities/doctor.entity'
import { OperationAuditLogEntity } from '../vpet-billing/entities/operation-audit-log.entity'
import { CustomerEntity } from '../vpet-customer/entities/customer.entity'
import { LabOrderEntity } from '../vpet-lab/entities/lab-order.entity'
import { PetEntity } from '../vpet-pet/entities/pet.entity'
import { PrescriptionEntity } from '../vpet-prescription/entities/prescription.entity'
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
import { ChronicCaseEntity } from './entities/chronic-case.entity'
import { ChronicFollowupEntity } from './entities/chronic-followup.entity'
import { DiagnosisCodeEntity } from './entities/diagnosis-code.entity'
import { ESignatureRecordEntity } from './entities/e-signature-record.entity'
import { EmrAuditLogEntity } from './entities/emr-audit-log.entity'
import { EmrUnlockRequestEntity } from './entities/emr-unlock-request.entity'
import { VisitCareFollowupLabEntity } from './entities/visit-care-followup-lab.entity'
import { VisitCareFollowupPrescriptionEntity } from './entities/visit-care-followup-prescription.entity'
import { VisitCareFollowupEntity } from './entities/visit-care-followup.entity'
import { VisitDiagnosisEntity } from './entities/visit-diagnosis.entity'
import { VisitEmrEntity } from './entities/visit-emr.entity'
import { VisitMediaBatchEntity } from './entities/visit-media-batch.entity'
import { VisitMediaFileEntity } from './entities/visit-media-file.entity'
import { VisitPlanBatchEntity } from './entities/visit-plan-batch.entity'
import { VisitProgressBatchEntity } from './entities/visit-progress-batch.entity'
import { VisitQueueEventEntity } from './entities/visit-queue-event.entity'
import { VisitEntity } from './entities/visit.entity'

interface CurrentStaffScopeOptions {
  scope?: string
  currentUserId?: number
  tenantId?: number
  areaId?: number
}

@Injectable()
export class VisitService extends BaseService<VisitEntity> {
  constructor(
    @InjectRepository(VisitEntity)
    private visitRepository: Repository<VisitEntity>,
    @InjectRepository(VisitEmrEntity)
    private emrRepository: Repository<VisitEmrEntity>,
    @InjectRepository(VisitDiagnosisEntity)
    private diagnosisRepository: Repository<VisitDiagnosisEntity>,
    @InjectRepository(ChronicCaseEntity)
    private chronicCaseRepository: Repository<ChronicCaseEntity>,
    @InjectRepository(ChronicFollowupEntity)
    private chronicFollowupRepository: Repository<ChronicFollowupEntity>,
    @InjectRepository(VisitCareFollowupEntity)
    private careFollowupRepository: Repository<VisitCareFollowupEntity>,
    @InjectRepository(VisitMediaBatchEntity)
    private mediaBatchRepository: Repository<VisitMediaBatchEntity>,
    @InjectRepository(VisitMediaFileEntity)
    private mediaFileRepository: Repository<VisitMediaFileEntity>,
    @InjectRepository(VisitCareFollowupLabEntity)
    private careFollowupLabRepository: Repository<VisitCareFollowupLabEntity>,
    @InjectRepository(VisitCareFollowupPrescriptionEntity)
    private careFollowupPrescriptionRepository: Repository<VisitCareFollowupPrescriptionEntity>,
    @InjectRepository(VisitProgressBatchEntity)
    private progressBatchRepository: Repository<VisitProgressBatchEntity>,
    @InjectRepository(VisitPlanBatchEntity)
    private planBatchRepository: Repository<VisitPlanBatchEntity>,
    @InjectRepository(DiagnosisCodeEntity)
    private diagnosisCodeRepository: Repository<DiagnosisCodeEntity>,
    @InjectRepository(VisitQueueEventEntity)
    private queueEventRepository: Repository<VisitQueueEventEntity>,
    @InjectRepository(EmrAuditLogEntity)
    private emrAuditRepository: Repository<EmrAuditLogEntity>,
    @InjectRepository(EmrUnlockRequestEntity)
    private emrUnlockRequestRepository: Repository<EmrUnlockRequestEntity>,
    @InjectRepository(ESignatureRecordEntity)
    private eSignatureRepository: Repository<ESignatureRecordEntity>,
    @InjectRepository(AppointmentEntity)
    private appointmentRepository: Repository<AppointmentEntity>,
    @InjectRepository(DoctorEntity)
    private doctorRepository: Repository<DoctorEntity>,
    @InjectRepository(CustomerEntity)
    private customerRepository: Repository<CustomerEntity>,
    @InjectRepository(PetEntity)
    private petRepository: Repository<PetEntity>,
    @InjectRepository(LabOrderEntity)
    private labOrderRepository: Repository<LabOrderEntity>,
    @InjectRepository(PrescriptionEntity)
    private prescriptionRepository: Repository<PrescriptionEntity>,
    @InjectRepository(OperationAuditLogEntity)
    private operationAuditRepository: Repository<OperationAuditLogEntity>,
  ) {
    super(visitRepository)
  }

  async createVisit(dto: CreateVisitDto): Promise<any> {
    const { tenantId, areaId } = requireTenantAreaContext(dto as any)
    if (dto.appointmentId) {
      const existing = await this.visitRepository.findOneBy({ appointmentId: dto.appointmentId, tenantId, areaId })
      if (existing)
        return this.findOneDetailed(existing.id, { tenantId, areaId })
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const [visitNo, queueNumber] = await Promise.all([
        this.generateVisitNo({ tenantId, areaId }),
        this.generateQueueNumber({ tenantId, areaId }),
      ])

      try {
        const visit = this.visitRepository.create({
          ...dto,
          tenantId,
          areaId,
          visitNo,
          queueNumber,
          status: 1,
          triageTime: new Date().toISOString(),
        })
        const saved = await this.visitRepository.save(visit)
        await this.appendQueueEvent(saved.id, 1, {
          queueNo: queueNumber,
          remark: 'checked_in',
        }, false, { tenantId, areaId })
        return this.findOneDetailed(saved.id, { tenantId, areaId })
      }
      catch (error) {
        if (!this.isVisitNoDuplicateError(error) || attempt === 4)
          throw error
      }
    }

    throw new Error('Failed to create visit')
  }

  async queryList(dto: QueryVisitDto, currentUserId?: number, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const {
      page = 1,
      pageSize = 10,
      appointmentId,
      petId,
      customerId,
      doctorId,
      status,
      keyword,
      dateFrom,
      dateTo,
    } = dto
    const scopedDoctorId = await this.resolveScopedDoctorId(dto.scope, currentUserId, tenantId)
    if (dto.scope === 'currentStaff' && !scopedDoctorId)
      return { items: [], meta: { totalItems: 0, itemCount: 0, itemsPerPage: pageSize, totalPages: 0, currentPage: page } }
    const qb = this.visitRepository.createQueryBuilder('v')
      .leftJoinAndSelect('v.pet', 'pet')
      .leftJoinAndSelect('v.customer', 'customer')
      .leftJoinAndSelect('v.doctor', 'doctor')
      .leftJoinAndSelect('v.emr', 'emr')
      .andWhere('v.tenantId = :tenantId', { tenantId })
      .andWhere('v.areaId = :areaId', { areaId })

    if (appointmentId)
      qb.andWhere('v.appointmentId = :appointmentId', { appointmentId })
    if (petId)
      qb.andWhere('v.petId = :petId', { petId })
    if (customerId)
      qb.andWhere('v.customerId = :customerId', { customerId })
    const effectiveDoctorId = scopedDoctorId ?? doctorId
    if (effectiveDoctorId)
      qb.andWhere('v.doctorId = :doctorId', { doctorId: effectiveDoctorId })
    if (status !== undefined)
      qb.andWhere('v.status = :status', { status })
    if (keyword) {
      qb.andWhere(new Brackets((subQb) => {
        subQb
          .where('v.visitNo LIKE :keyword', { keyword: `%${keyword}%` })
          .orWhere('pet.name LIKE :keyword', { keyword: `%${keyword}%` })
          .orWhere('customer.name LIKE :keyword', { keyword: `%${keyword}%` })
          .orWhere('emr.chiefComplaint LIKE :keyword', { keyword: `%${keyword}%` })
      }))
    }
    if (dateFrom)
      qb.andWhere('v.createdAt >= :dateFrom', { dateFrom })
    if (dateTo)
      qb.andWhere('v.createdAt <= :dateTo', { dateTo })

    qb.orderBy('v.createdAt', 'DESC')
    const result = await paginate(qb, { page, pageSize })
    return {
      items: result.items.map(item => this.mapVisitDetail(item)),
      meta: result.meta,
    }
  }

  async startConsultation(id: number, options: CurrentStaffScopeOptions = {}): Promise<any> {
    const visit = await this.findScopedVisit(id, options)
    if (!visit) {
      throw new BusinessException('Visit not found')
    }
    await this.assertVisitBelongsToScopedDoctor(visit, options)

    const now = new Date().toISOString()
    const latestStartEvent = await this.queueEventRepository.findOne({
      where: { visitId: id, eventType: 3, tenantId: visit.tenantId, areaId: visit.areaId },
      order: { eventTime: 'DESC', id: 'DESC' },
    })

    if (Number(visit.status) === 3 && visit.startTime && latestStartEvent) {
      return this.findOneDetailed(id, options)
    }

    if (Number(visit.status) === 4 && visit.startTime) {
      return this.findOneDetailed(id, options)
    }

    if (!visit.callTime) {
      await this.appendQueueEvent(id, 2, {
        queueNo: visit.queueNumber,
        remark: 'called',
      }, true, { tenantId: visit.tenantId, areaId: visit.areaId })
    }

    await this.visitRepository.update({ id, tenantId: visit.tenantId, areaId: visit.areaId }, {
      status: 3,
      startTime: visit.startTime ?? now,
      callTime: visit.callTime ?? now,
    })
    await this.appendQueueEvent(id, 3, {
      queueNo: visit.queueNumber,
      remark: 'consultation_started',
    }, true, { tenantId: visit.tenantId, areaId: visit.areaId })
    return this.findOneDetailed(id, options)
  }

  async saveSoap(id: number, dto: UpdateVisitDto, options: CurrentStaffScopeOptions = {}): Promise<void> {
    const visit = await this.findScopedVisit(id, options)
    if (!visit) {
      throw new BusinessException('Visit not found')
    }
    await this.assertVisitBelongsToScopedDoctor(visit, options)

    const currentEmr = await this.emrRepository.findOneBy({ visitId: id, tenantId: visit.tenantId, areaId: visit.areaId })
    if (Number(currentEmr?.locked ?? visit.locked ?? 0) === 1) {
      throw new BusinessException('EMR is locked. Please request unlock before editing.')
    }

    const physicalExam = dto.physicalExam ? JSON.parse(dto.physicalExam as string) : undefined
    const diagnosisList = dto.diagnosis ? this.normalizeDiagnoses(JSON.parse(dto.diagnosis as string)) : undefined
    const ongoingFlags = dto.ongoingFlags ? JSON.parse(dto.ongoingFlags as string) : undefined
    const structuredActions = dto.structuredActions ? JSON.parse(dto.structuredActions as string) : undefined
    const followUpActions = dto.followUpActions ? JSON.parse(dto.followUpActions as string) : undefined
    const recordedBy = await this.resolveActorDoctorId(visit, options)

    let emr = currentEmr
    if (!emr) {
      emr = this.emrRepository.create({
        tenantId: visit.tenantId,
        areaId: visit.areaId,
        visitId: id,
        chiefComplaint: visit.chiefComplaint ?? null,
        physicalExam: visit.physicalExam ?? null,
        planText: visit.treatmentPlan ?? null,
        doctorAdvice: visit.doctorAdvice ?? null,
        locked: visit.locked ?? 0,
      })
    }

    if (dto.chiefComplaint !== undefined)
      emr.chiefComplaint = dto.chiefComplaint
    if (physicalExam !== undefined)
      emr.physicalExam = physicalExam
    if (dto.assessmentText !== undefined)
      emr.assessmentText = dto.assessmentText
    if (dto.treatmentPlan !== undefined)
      emr.planText = dto.treatmentPlan
    if (dto.doctorAdvice !== undefined)
      emr.doctorAdvice = dto.doctorAdvice
    await this.emrRepository.save(emr)

    if (diagnosisList !== undefined) {
      await this.diagnosisRepository.delete({ visitId: id, tenantId: visit.tenantId, areaId: visit.areaId })
      if (diagnosisList.length > 0) {
        await this.diagnosisRepository.save(
          diagnosisList.map((item, index) =>
            this.diagnosisRepository.create({
              tenantId: visit.tenantId,
              areaId: visit.areaId,
              visitId: id,
              diagnosisCode: item.code ?? item.name ?? null,
              diagnosisName: item.name ?? item.code ?? `diagnosis-${index + 1}`,
              diagnosisType: this.resolveDiagnosisType(item.type),
              sortNo: index,
              isPrimary: index === 0 ? 1 : 0,
              recordedBy,
            }),
          ),
        )
      }
    }

    const visitUpdate: Partial<VisitEntity> = {}
    if (dto.status !== undefined)
      visitUpdate.status = dto.status
    if (dto.careMode !== undefined)
      visitUpdate.careMode = dto.careMode
    if (dto.careStage !== undefined)
      visitUpdate.careStage = dto.careStage
    if (dto.startTime !== undefined)
      visitUpdate.startTime = dto.startTime
    if (dto.endTime !== undefined)
      visitUpdate.endTime = dto.endTime
    if (dto.followUpDate !== undefined)
      visitUpdate.followUpDate = dto.followUpDate
    if (ongoingFlags !== undefined)
      visitUpdate.ongoingFlags = ongoingFlags
    if (dto.chiefComplaint !== undefined)
      visitUpdate.chiefComplaint = dto.chiefComplaint
    if (physicalExam !== undefined)
      visitUpdate.physicalExam = physicalExam
    if (diagnosisList !== undefined)
      visitUpdate.diagnosis = diagnosisList
    if (dto.treatmentPlan !== undefined)
      visitUpdate.treatmentPlan = dto.treatmentPlan
    if (dto.doctorAdvice !== undefined)
      visitUpdate.doctorAdvice = dto.doctorAdvice

    if (Object.keys(visitUpdate).length > 0) {
      await this.visitRepository.update({ id, tenantId: visit.tenantId, areaId: visit.areaId }, visitUpdate)
    }

    if (
      dto.progressBatchNo
      || dto.symptomSummary !== undefined
      || dto.statusSummary !== undefined
      || physicalExam !== undefined
      || dto.progressAssessmentText !== undefined
      || diagnosisList !== undefined
    ) {
      await this.saveProgressBatch(visit, {
        batchNo: dto.progressBatchNo,
        careStage: dto.careStage,
        symptomSummary: dto.symptomSummary ?? dto.chiefComplaint,
        statusSummary: dto.statusSummary,
        physicalExam,
        assessmentText: dto.progressAssessmentText ?? dto.assessmentText,
        diagnosisSnapshot: diagnosisList,
        recordedBy,
      })
    }

    if (
      dto.planBatchNo
      || dto.planSummary !== undefined
      || dto.treatmentPlan !== undefined
      || dto.doctorAdvice !== undefined
      || structuredActions !== undefined
      || followUpActions !== undefined
    ) {
      await this.savePlanBatch(visit, {
        batchNo: dto.planBatchNo,
        careStage: dto.careStage,
        planSummary: dto.planSummary ?? dto.treatmentPlan,
        doctorAdvice: dto.doctorAdvice,
        structuredActions,
        followUpActions,
        recordedBy,
      })
    }
  }

  async lockEmr(id: number, dto: LockEmrDto, options: CurrentStaffScopeOptions = {}) {
    const { tenantId, areaId } = requireTenantAreaContext(options)
    const visit = await this.visitRepository.findOne({
      where: { id, tenantId, areaId },
      relations: ['emr'],
    })
    if (!visit) {
      throw new BusinessException('Visit not found')
    }
    await this.assertVisitBelongsToScopedDoctor(visit, options)

    const emr = await this.ensureEmrForVisit(visit)
    if (Number(emr.locked) === 1 && Number(visit.locked) === 1) {
      return this.findOneDetailed(id, options)
    }

    const before = this.createEmrSnapshot(emr, visit)
    const now = new Date().toISOString()
    emr.locked = 1
    emr.lockedAt = now
    await this.emrRepository.save(emr)
    await this.visitRepository.update({ id, tenantId: visit.tenantId, areaId: visit.areaId }, { locked: 1 })

    const operatorId = await this.resolveActorDoctorId(visit, options) ?? dto.operatorId ?? null
    const after = this.createEmrSnapshot(emr, { ...visit, locked: 1 } as VisitEntity)
    await this.writeEmrAudit(id, emr.id, 'lock', before, after, dto.reason, operatorId, { tenantId: visit.tenantId, areaId: visit.areaId })
    return this.findOneDetailed(id, options)
  }

  async requestUnlockEmr(id: number, dto: RequestUnlockEmrDto, options: CurrentStaffScopeOptions = {}) {
    const { tenantId, areaId } = requireTenantAreaContext(options)
    const visit = await this.visitRepository.findOne({
      where: { id, tenantId, areaId },
      relations: ['emr'],
    })
    if (!visit) {
      throw new BusinessException('Visit not found')
    }
    await this.assertVisitBelongsToScopedDoctor(visit, options)

    const emr = await this.ensureEmrForVisit(visit)
    if (Number(emr.locked ?? visit.locked ?? 0) !== 1) {
      throw new BusinessException('EMR is not locked')
    }

    const pending = await this.emrUnlockRequestRepository.findOne({
      where: { visitId: id, requestStatus: 1, tenantId: visit.tenantId, areaId: visit.areaId },
      order: { id: 'DESC' },
    })
    if (pending)
      return pending

    const operatorId = await this.resolveActorDoctorId(visit, options) ?? dto.operatorId ?? null
    const request = await this.emrUnlockRequestRepository.save(this.emrUnlockRequestRepository.create({
      tenantId: visit.tenantId,
      areaId: visit.areaId,
      visitId: id,
      emrId: emr.id,
      requestReason: dto.reason,
      requestedBy: operatorId,
      requestStatus: 1,
    }))

    await this.writeEmrAudit(
      id,
      emr.id,
      'unlock_requested',
      this.createEmrSnapshot(emr, visit),
      this.createEmrSnapshot(emr, visit),
      dto.reason,
      operatorId,
      { tenantId: visit.tenantId, areaId: visit.areaId },
    )
    return request
  }

  async reviewUnlockRequest(requestId: number, dto: ReviewUnlockEmrDto, options: CurrentStaffScopeOptions = {}) {
    const { tenantId, areaId } = requireTenantAreaContext(options)
    const request = await this.emrUnlockRequestRepository.findOneBy({ id: requestId, tenantId, areaId })
    if (!request)
      throw new BusinessException('Unlock request not found')
    if (Number(request.requestStatus) !== 1) {
      throw new BusinessException('Unlock request has already been reviewed')
    }
    if (![2, 3].includes(Number(dto.status))) {
      throw new BusinessException('Unlock review status must be approved or rejected')
    }

    const visit = await this.visitRepository.findOne({
      where: { id: request.visitId, tenantId, areaId },
      relations: ['emr'],
    })
    if (!visit)
      throw new BusinessException('Visit not found')
    const emr = await this.ensureEmrForVisit(visit)
    const before = this.createEmrSnapshot(emr, visit)

    request.requestStatus = dto.status
    request.reviewedBy = dto.operatorId ?? null
    request.reviewedAt = new Date().toISOString()
    request.reviewRemark = dto.remark ?? null
    await this.emrUnlockRequestRepository.save(request)

    if (Number(dto.status) === 2) {
      emr.locked = 0
      emr.lockedAt = null
      await this.emrRepository.save(emr)
      await this.visitRepository.update({ id: request.visitId, tenantId, areaId }, { locked: 0 })
    }

    const after = this.createEmrSnapshot(emr, {
      ...visit,
      locked: Number(dto.status) === 2 ? 0 : visit.locked,
    } as VisitEntity)
    await this.writeEmrAudit(
      request.visitId,
      emr.id,
      Number(dto.status) === 2 ? 'unlock_approved' : 'unlock_rejected',
      before,
      after,
      dto.remark,
      dto.operatorId,
      { tenantId, areaId },
    )
    return request
  }

  async signEmr(id: number, dto: SignEmrDto, options: CurrentStaffScopeOptions = {}) {
    const { tenantId, areaId } = requireTenantAreaContext(options)
    const visit = await this.visitRepository.findOne({
      where: { id, tenantId, areaId },
      relations: ['emr', 'diagnoses', 'progressBatches', 'planBatches'],
    })
    if (!visit) {
      throw new BusinessException('Visit not found')
    }
    await this.assertVisitBelongsToScopedDoctor(visit, options)

    const emr = await this.ensureEmrForVisit(visit)
    const before = this.createEmrSnapshot(emr, visit)
    const signedAt = new Date().toISOString()
    const operatorId = await this.resolveActorDoctorId(visit, options) ?? dto.operatorId ?? null
    const signedSnapshot = this.createEmrSnapshot(emr, visit)
    const signatureHash = createHash('sha256')
      .update(JSON.stringify({ signedAt, signedBy: operatorId, signedSnapshot }))
      .digest('hex')

    const signature = await this.eSignatureRepository.save(this.eSignatureRepository.create({
      tenantId: visit.tenantId,
      areaId: visit.areaId,
      visitId: id,
      emrId: emr.id,
      signType: dto.signType ?? 'doctor',
      signatureHash,
      signedBy: operatorId,
      signedAt,
      signedSnapshot,
      status: 1,
    }))

    emr.locked = 1
    emr.lockedAt = signedAt
    await this.emrRepository.save(emr)
    await this.visitRepository.update({ id, tenantId: visit.tenantId, areaId: visit.areaId }, { locked: 1 })

    await this.writeEmrAudit(
      id,
      emr.id,
      'signed',
      before,
      this.createEmrSnapshot(emr, { ...visit, locked: 1 } as VisitEntity),
      dto.reason,
      operatorId,
      { tenantId: visit.tenantId, areaId: visit.areaId },
    )
    return signature
  }

  async listEmrAuditLogs(visitId: number, options: CurrentStaffScopeOptions = {}) {
    const visit = await this.findScopedVisit(visitId, options)
    if (!visit) {
      throw new BusinessException('Visit not found')
    }
    await this.assertVisitBelongsToScopedDoctor(visit, options)
    return this.emrAuditRepository.find({
      where: { visitId, tenantId: visit.tenantId, areaId: visit.areaId },
      relations: ['operator'],
      order: { createdAt: 'DESC', id: 'DESC' },
    })
  }

  async recordPrintAudit(id: number, options: CurrentStaffScopeOptions = {}) {
    const visit = await this.findScopedVisit(id, options)
    if (!visit) {
      throw new BusinessException('Visit not found')
    }
    await this.assertVisitBelongsToScopedDoctor(visit, options)

    const operatorId = await this.resolveActorDoctorId(visit, options)
    await this.operationAuditRepository.save(this.operationAuditRepository.create({
      tenantId: visit.tenantId,
      areaId: visit.areaId,
      bizType: 'emr',
      bizId: visit.id,
      action: 'print',
      beforeSnapshot: null,
      afterSnapshot: {
        visitId: visit.id,
        visitNo: visit.visitNo,
        printedAt: new Date().toISOString(),
      },
      reason: 'medical_record_print',
      operatorId: operatorId ?? options.currentUserId ?? null,
    }))

    return { success: true }
  }

  async listUnlockRequests(params: { visitId?: number, status?: number }, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const qb = this.emrUnlockRequestRepository.createQueryBuilder('r')
      .where('r.tenantId = :tenantId', { tenantId })
      .andWhere('r.areaId = :areaId', { areaId })
    if (params.visitId)
      qb.andWhere('r.visitId = :visitId', { visitId: params.visitId })
    if (params.status !== undefined)
      qb.andWhere('r.requestStatus = :status', { status: params.status })
    return qb.orderBy('r.createdAt', 'DESC').addOrderBy('r.id', 'DESC').getMany()
  }

  async listSignatures(visitId: number, options: CurrentStaffScopeOptions = {}) {
    const visit = await this.findScopedVisit(visitId, options)
    if (!visit) {
      throw new BusinessException('Visit not found')
    }
    await this.assertVisitBelongsToScopedDoctor(visit, options)
    return this.eSignatureRepository.find({
      where: { visitId, tenantId: visit.tenantId, areaId: visit.areaId },
      order: { signedAt: 'DESC', id: 'DESC' },
    })
  }

  async endConsultation(id: number, options: CurrentStaffScopeOptions = {}): Promise<void> {
    const visit = await this.findScopedVisit(id, options)
    if (!visit) {
      throw new BusinessException('Visit not found')
    }
    await this.assertVisitBelongsToScopedDoctor(visit, options)
    if (Number(visit.status) === 4 && visit.endTime) {
      return
    }

    const now = new Date().toISOString()
    await this.visitRepository.update({ id, tenantId: visit.tenantId, areaId: visit.areaId }, {
      status: 4,
      endTime: now,
    })
    await this.appendQueueEvent(id, 4, {
      queueNo: visit.queueNumber,
      remark: 'consultation_finished',
    }, true, { tenantId: visit.tenantId, areaId: visit.areaId })

    if (visit.appointmentId) {
      await this.appointmentRepository.update({ id: visit.appointmentId, tenantId: visit.tenantId, areaId: visit.areaId }, { status: 3 })
    }
  }

  async getTodayQueue(params: { doctorId?: number, scope?: string, currentUserId?: number, tenantId?: number, areaId?: number } = {}) {
    const { tenantId, areaId } = requireTenantAreaContext(params)
    const scopedDoctorId = await this.resolveScopedDoctorId(params.scope, params.currentUserId, tenantId)
    if (params.scope === 'currentStaff' && !scopedDoctorId)
      return []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const qb = this.visitRepository.createQueryBuilder('v')
      .leftJoinAndSelect('v.pet', 'pet')
      .leftJoinAndSelect('v.customer', 'customer')
      .leftJoinAndSelect('v.doctor', 'doctor')
      .where('v.createdAt >= :today', { today })
      .andWhere('v.tenantId = :tenantId', { tenantId })
      .andWhere('v.areaId = :areaId', { areaId })
      .andWhere('v.status IN (:...statuses)', { statuses: [1, 2, 3] })
      .orderBy('v.status', 'ASC')
      .addOrderBy('v.createdAt', 'ASC')

    const effectiveDoctorId = scopedDoctorId ?? params.doctorId
    if (effectiveDoctorId)
      qb.andWhere('v.doctorId = :doctorId', { doctorId: effectiveDoctorId })
    const visits = await qb.getMany()
    return visits.map(item => this.mapVisitDetail(item))
  }

  async searchDiagnosisCodes(params: { keyword?: string, species?: string }, context?: Pick<IAuthUser, 'tenantId'>) {
    const { keyword, species } = params
    const { tenantId } = requireTenantContext(context)
    const qb = this.diagnosisCodeRepository.createQueryBuilder('d')
      .where('d.tenantId = :tenantId', { tenantId })

    if (species) {
      qb.andWhere('d.speciesScope IN (:...speciesScopes)', {
        speciesScopes: ['all', species],
      })
    }

    if (keyword) {
      qb.andWhere(new Brackets((subQb) => {
        subQb
          .where('d.code LIKE :keyword', { keyword: `%${keyword}%` })
          .orWhere('d.name LIKE :keyword', { keyword: `%${keyword}%` })
      }))
    }

    qb.orderBy('d.code', 'ASC')
    return qb.take(50).getMany()
  }

  async listDiagnosisCodes(dto: QueryDiagnosisCodeDto, context?: Pick<IAuthUser, 'tenantId'>) {
    const { page = 1, pageSize = 10, keyword, category, species } = dto
    const { tenantId } = requireTenantContext(context)
    const qb = this.diagnosisCodeRepository.createQueryBuilder('d')
      .where('d.tenantId = :tenantId', { tenantId })

    if (keyword) {
      qb.andWhere(new Brackets((subQb) => {
        subQb
          .where('d.code LIKE :keyword', { keyword: `%${keyword}%` })
          .orWhere('d.name LIKE :keyword', { keyword: `%${keyword}%` })
      }))
    }
    if (category)
      qb.andWhere('d.category = :category', { category })
    if (species)
      qb.andWhere('d.speciesScope IN (:...speciesScopes)', { speciesScopes: ['all', species] })

    qb.orderBy('d.category', 'ASC').addOrderBy('d.code', 'ASC')
    return paginate(qb, { page, pageSize })
  }

  async createDiagnosisCode(dto: CreateDiagnosisCodeDto, context?: Pick<IAuthUser, 'tenantId'>) {
    const { tenantId } = requireTenantContext(context)
    const exists = await this.diagnosisCodeRepository.findOneBy({ code: dto.code, tenantId })
    if (exists)
      throw new BusinessException('Diagnosis code already exists')
    return this.diagnosisCodeRepository.save(this.diagnosisCodeRepository.create({
      tenantId,
      code: dto.code,
      name: dto.name,
      category: dto.category,
      speciesScope: dto.speciesScope || 'all',
    }))
  }

  async updateDiagnosisCode(code: string, dto: UpdateDiagnosisCodeDto, context?: Pick<IAuthUser, 'tenantId'>) {
    const { tenantId } = requireTenantContext(context)
    const current = await this.diagnosisCodeRepository.findOneBy({ code, tenantId })
    if (!current)
      throw new BusinessException('Diagnosis code not found')
    const payload = Object.fromEntries(Object.entries({
      name: dto.name,
      category: dto.category,
      speciesScope: dto.speciesScope,
    }).filter(([, value]) => value !== undefined))
    if (Object.keys(payload).length > 0)
      await this.diagnosisCodeRepository.update({ code, tenantId }, payload)
  }

  async deleteDiagnosisCode(code: string, context?: Pick<IAuthUser, 'tenantId'>) {
    const { tenantId } = requireTenantContext(context)
    const current = await this.diagnosisCodeRepository.findOneBy({ code, tenantId })
    if (!current)
      throw new BusinessException('Diagnosis code not found')
    await this.diagnosisCodeRepository.delete({ code, tenantId })
  }

  async findOneDetailed(id: number, options: CurrentStaffScopeOptions = {}): Promise<any> {
    const { tenantId, areaId } = requireTenantAreaContext(options)
    const item = await this.visitRepository.findOne({
      where: { id, tenantId, areaId },
      relations: [
        'pet',
        'customer',
        'doctor',
        'emr',
        'diagnoses',
        'diagnoses.recorder',
        'queueEvents',
        'progressBatches',
        'progressBatches.recorder',
        'planBatches',
        'planBatches.recorder',
        'careFollowups',
        'careFollowups.recorder',
        'mediaBatches',
        'mediaBatches.operator',
        'mediaBatches.careFollowup',
        'mediaBatches.files',
      ],
    })
    if (!item)
      throw new BusinessException('Visit not found')
    await this.assertVisitBelongsToScopedDoctor(item, options)

    return this.mapVisitDetail(item)
  }

  async listVisitCareFollowups(visitId: number, options: CurrentStaffScopeOptions = {}) {
    const visit = await this.findScopedVisit(visitId, options)
    if (!visit) {
      throw new BusinessException('Visit not found')
    }
    await this.assertVisitBelongsToScopedDoctor(visit, options)

    const rows = await this.careFollowupRepository.find({
      where: { visitId, tenantId: visit.tenantId, areaId: visit.areaId },
      relations: [
        'labLinks',
        'labLinks.labOrder',
        'labLinks.labOrder.resultItems',
        'prescriptionLinks',
        'prescriptionLinks.prescription',
        'prescriptionLinks.prescription.details',
        'recorder',
      ],
      order: { occurredAt: 'DESC', id: 'DESC' },
    })

    return rows.map(item => this.mapCareFollowup(item))
  }

  async createVisitCareFollowup(visitId: number, dto: CreateVisitCareFollowupDto, options: CurrentStaffScopeOptions = {}) {
    const visit = await this.findScopedVisit(visitId, options)
    if (!visit)
      throw new BusinessException('Visit not found')
    await this.assertVisitBelongsToScopedDoctor(visit, options)

    const labOrderIds = this.normalizeIdList(dto.labOrderIds)
    const prescriptionIds = this.normalizeIdList(dto.prescriptionIds)

    await this.assertLabOrdersBelongToVisit(visit, labOrderIds)
    await this.assertPrescriptionsBelongToVisit(visit, prescriptionIds)
    const recordedBy = dto.recordedBy ?? await this.resolveActorDoctorId(visit, options)

    const followup = await this.careFollowupRepository.save(this.careFollowupRepository.create({
      tenantId: visit.tenantId,
      areaId: visit.areaId,
      visitId,
      batchNo: await this.generateCareFollowupBatchNo(visit),
      occurredAt: dto.occurredAt ?? new Date().toISOString(),
      careStage: dto.careStage ?? visit.careStage ?? null,
      symptomSummary: dto.symptomSummary ?? null,
      statusSummary: dto.statusSummary ?? null,
      vitalSigns: dto.vitalSigns ? JSON.parse(dto.vitalSigns) : null,
      objectiveNote: dto.objectiveNote ?? null,
      assessmentText: dto.assessmentText ?? null,
      planAdjustment: dto.planAdjustment ?? null,
      medicationAdjustment: dto.medicationAdjustment ?? null,
      remark: dto.remark ?? null,
      recordedBy,
    }))

    if (labOrderIds.length > 0) {
      await this.careFollowupLabRepository.save(
        labOrderIds.map(labOrderId => this.careFollowupLabRepository.create({
          tenantId: visit.tenantId,
          areaId: visit.areaId,
          followupId: followup.id,
          labOrderId,
        })),
      )
    }

    if (prescriptionIds.length > 0) {
      await this.careFollowupPrescriptionRepository.save(
        prescriptionIds.map(prescriptionId => this.careFollowupPrescriptionRepository.create({
          tenantId: visit.tenantId,
          areaId: visit.areaId,
          followupId: followup.id,
          prescriptionId,
        })),
      )
    }

    return this.listVisitCareFollowups(visitId, options)
  }

  async listVisitMediaBatches(visitId: number, options: CurrentStaffScopeOptions = {}) {
    const visit = await this.findScopedVisit(visitId, options)
    if (!visit)
      throw new BusinessException('Visit not found')
    await this.assertVisitBelongsToScopedDoctor(visit, options)

    const rows = await this.mediaBatchRepository.find({
      where: { visitId, tenantId: visit.tenantId, areaId: visit.areaId },
      relations: ['operator', 'careFollowup', 'files'],
      order: {
        capturedAt: 'DESC',
        id: 'DESC',
        files: {
          sortNo: 'ASC',
          id: 'ASC',
        },
      },
    })
    return rows.map(item => this.mapMediaBatch(item))
  }

  async createVisitMediaBatch(visitId: number, dto: CreateVisitMediaBatchDto, options: CurrentStaffScopeOptions = {}) {
    const visit = await this.findScopedVisit(visitId, options)
    if (!visit)
      throw new BusinessException('Visit not found')
    await this.assertVisitBelongsToScopedDoctor(visit, options)

    if (dto.relationType === 'care_followup') {
      if (!dto.careFollowupId)
        throw new BusinessException('Care followup is required when media is linked to continuous care')
      await this.assertCareFollowupBelongsToVisit(visit, dto.careFollowupId)
    }

    const operatorId = dto.operatorId ?? await this.resolveActorDoctorId(visit, options)
    const batch = await this.mediaBatchRepository.save(this.mediaBatchRepository.create({
      tenantId: visit.tenantId,
      areaId: visit.areaId,
      visitId,
      batchNo: await this.generateMediaBatchNo(visit),
      capturedAt: dto.capturedAt ?? new Date().toISOString(),
      operatorId: operatorId ?? null,
      relationType: dto.relationType || 'soap',
      careFollowupId: dto.relationType === 'care_followup' ? dto.careFollowupId! : null,
      remark: dto.remark ?? null,
    }))

    return this.mediaBatchRepository.findOne({
      where: { id: batch.id, tenantId: visit.tenantId, areaId: visit.areaId },
      relations: ['operator', 'careFollowup', 'files'],
    }).then(item => item ? this.mapMediaBatch(item) : batch)
  }

  async createVisitMediaFile(visitId: number, batchId: number, dto: CreateVisitMediaFileDto, options: CurrentStaffScopeOptions = {}) {
    const visit = await this.findScopedVisit(visitId, options)
    if (!visit)
      throw new BusinessException('Visit not found')
    await this.assertVisitBelongsToScopedDoctor(visit, options)

    const batch = await this.mediaBatchRepository.findOneBy({ id: batchId, visitId, tenantId: visit.tenantId, areaId: visit.areaId })
    if (!batch)
      throw new BusinessException('Media batch not found')

    const safeUrl = this.validateVisitMediaUrl(dto.storageType, dto.url)
    this.validateVisitMediaMimeType(dto.fileType, dto.mimeType)

    await this.mediaFileRepository.save(this.mediaFileRepository.create({
      tenantId: visit.tenantId,
      areaId: visit.areaId,
      batchId,
      visitId,
      fileType: dto.fileType,
      storageType: dto.storageType,
      fileName: dto.fileName ?? null,
      originalName: dto.originalName ?? null,
      url: safeUrl,
      mimeType: dto.mimeType ?? null,
      fileSize: dto.fileSize ?? null,
      sortNo: dto.sortNo ?? await this.nextMediaFileSortNo(batchId),
      remark: dto.remark ?? null,
    }))

    return this.listVisitMediaBatches(visitId, options)
  }

  private validateVisitMediaUrl(storageType: string, rawUrl: string) {
    const url = (rawUrl || '').trim()
    if (!url)
      throw new BusinessException('Media URL is required')
    const scheme = url.includes(':') ? url.split(':')[0].toLowerCase() : ''
    if (['javascript', 'data', 'file', 'vbscript'].includes(scheme))
      throw new BusinessException('Unsupported media URL protocol')

    if (storageType === 'local') {
      if (!url.startsWith('/api/storage/file/'))
        throw new BusinessException('Local media URL must reference an uploaded file')
      if (url.includes('..') || url.includes('\\'))
        throw new BusinessException('Invalid local media URL')
      return url
    }

    if (storageType !== 'oss')
      throw new BusinessException('Unsupported media storage type')

    const allowedHosts = this.getAllowedMediaHosts()
    try {
      const parsed = new URL(url)
      if (!['http:', 'https:'].includes(parsed.protocol))
        throw new BusinessException('Unsupported media URL protocol')
      if (!allowedHosts.has(parsed.host))
        throw new BusinessException('Media URL host is not allowed')
      return parsed.toString()
    }
    catch (error) {
      if (error instanceof BusinessException)
        throw error
      throw new BusinessException('Invalid media URL')
    }
  }

  private getAllowedMediaHosts() {
    const hosts = new Set<string>()
    const collectHost = (value?: string) => {
      const trimmed = (value || '').trim()
      if (!trimmed)
        return
      try {
        hosts.add(new URL(trimmed).host)
      }
      catch {
        hosts.add(trimmed.replace(/^https?:\/\//i, '').split('/')[0])
      }
    }

    ;(process.env.OSS_PUBLIC_HOSTS || '').split(',').forEach(collectHost)
    collectHost(process.env.OSS_DOMAIN)
    collectHost(process.env.APP_BASE_URL)
    return hosts
  }

  private validateVisitMediaMimeType(fileType: string, mimeType?: string) {
    if (!mimeType)
      return
    if (fileType === 'image' && !mimeType.startsWith('image/'))
      throw new BusinessException('Image media must use an image MIME type')
    if (fileType === 'video' && !mimeType.startsWith('video/'))
      throw new BusinessException('Video media must use a video MIME type')
  }

  async findByAppointmentId(appointmentId: number, context: Pick<IAuthUser, 'tenantId' | 'areaId'>): Promise<any> {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const visit = await this.visitRepository.findOneBy({ appointmentId, tenantId, areaId })
    if (!visit)
      return null
    return this.findOneDetailed(visit.id, { tenantId: visit.tenantId, areaId: visit.areaId })
  }

  async createChronicCase(dto: CreateChronicCaseDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const visit = dto.visitId
      ? await this.visitRepository.findOne({
        where: { id: dto.visitId, tenantId, areaId },
        relations: ['customer', 'pet'],
      })
      : null
    const customerId = visit?.customerId ?? dto.customerId
    const petId = visit?.petId ?? dto.petId

    const [customer, pet] = await Promise.all([
      visit?.customer ? Promise.resolve(visit.customer) : this.customerRepository.findOneBy({ id: customerId, tenantId }),
      visit?.pet ? Promise.resolve(visit.pet) : this.petRepository.findOneBy({ id: petId, tenantId }),
    ])

    if (!customer) {
      throw new BusinessException('Customer not found')
    }
    if (!pet) {
      throw new BusinessException('Pet not found')
    }
    if (Number(pet.customerId) !== Number(customer.id)) {
      throw new BusinessException('Pet does not belong to the selected customer')
    }

    const customerSnapshot = { id: customer.id, name: customer.name, phone: customer.phone }
    const petSnapshot = { id: pet.id, name: pet.name, species: pet.species, breed: pet.breed }

    const chronicCase = this.chronicCaseRepository.create({
      tenantId,
      areaId,
      caseNo: await this.generateChronicCaseNo({ tenantId, areaId }),
      customerId: customer.id,
      petId: pet.id,
      visitId: dto.visitId ?? null,
      diseaseName: dto.diseaseName,
      diseaseTags: dto.diseaseTags ? JSON.parse(dto.diseaseTags) : null,
      initialSummary: dto.initialSummary ?? null,
      managementGoal: dto.managementGoal ?? null,
      carePlan: dto.carePlan ? JSON.parse(dto.carePlan) : null,
      trackingSchema: dto.trackingSchema ? JSON.parse(dto.trackingSchema) : null,
      nextReviewDate: dto.nextReviewDate ?? null,
      status: 1,
      customerSnapshot,
      petSnapshot,
    })
    return this.chronicCaseRepository.save(chronicCase)
  }

  async addChronicFollowup(chronicCaseId: number, dto: CreateChronicFollowupDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const chronicCase = await this.chronicCaseRepository.findOneBy({ id: chronicCaseId, tenantId, areaId })
    if (!chronicCase) {
      throw new BusinessException('Chronic case not found')
    }

    if (dto.visitId) {
      const visit = await this.visitRepository.findOneBy({ id: dto.visitId, tenantId, areaId })
      if (!visit) {
        throw new BusinessException('Visit not found')
      }
      if (Number(visit.petId) !== Number(chronicCase.petId)) {
        throw new BusinessException('Visit does not belong to the same pet')
      }
    }

    const followup = this.chronicFollowupRepository.create({
      tenantId,
      areaId,
      chronicCaseId,
      visitId: dto.visitId ?? null,
      reviewDate: dto.reviewDate ?? new Date().toISOString(),
      symptomSummary: dto.symptomSummary ?? null,
      statusSummary: dto.statusSummary ?? null,
      metricValues: dto.metricValues ? JSON.parse(dto.metricValues) : null,
      planAdjustment: dto.planAdjustment ?? null,
      nextReviewDate: dto.nextReviewDate ?? null,
      status: 1,
    })
    await this.chronicFollowupRepository.save(followup)

    await this.chronicCaseRepository.update({ id: chronicCaseId, tenantId, areaId }, {
      nextReviewDate: dto.nextReviewDate ?? chronicCase.nextReviewDate ?? null,
    })

    return this.getChronicCaseDetail(chronicCaseId, { tenantId, areaId })
  }

  async listChronicCases(params: {
    petId?: number
    customerId?: number
    status?: number
    keyword?: string
  }, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { petId, customerId, status, keyword } = params
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const qb = this.chronicCaseRepository.createQueryBuilder('c')
      .leftJoinAndSelect('c.customer', 'customer')
      .leftJoinAndSelect('c.pet', 'pet')
      .leftJoinAndSelect('c.visit', 'visit')
      .leftJoinAndSelect('c.followups', 'followups')
      .where('c.tenantId = :tenantId', { tenantId })
      .andWhere('c.areaId = :areaId', { areaId })

    if (petId)
      qb.andWhere('c.petId = :petId', { petId })
    if (customerId)
      qb.andWhere('c.customerId = :customerId', { customerId })
    if (status !== undefined)
      qb.andWhere('c.status = :status', { status })
    if (keyword) {
      qb.andWhere(new Brackets((subQb) => {
        subQb
          .where('c.caseNo LIKE :keyword', { keyword: `%${keyword}%` })
          .orWhere('c.diseaseName LIKE :keyword', { keyword: `%${keyword}%` })
          .orWhere('pet.name LIKE :keyword', { keyword: `%${keyword}%` })
          .orWhere('customer.name LIKE :keyword', { keyword: `%${keyword}%` })
      }))
    }

    qb.orderBy('c.createdAt', 'DESC')
      .addOrderBy('followups.reviewDate', 'DESC')

    return qb.getMany()
  }

  async getChronicCaseDetail(id: number, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    return this.chronicCaseRepository.findOne({
      where: { id, tenantId, areaId },
      relations: ['customer', 'pet', 'visit', 'followups'],
      order: { followups: { reviewDate: 'DESC' } },
    })
  }

  async getChronicReport(id: number, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const chronicCase = await this.chronicCaseRepository.findOne({
      where: { id, tenantId, areaId },
      relations: ['followups'],
    })
    if (!chronicCase) {
      throw new BusinessException('Chronic case not found')
    }

    const timeline = (chronicCase.followups || [])
      .slice()
      .sort((a, b) => new Date(a.reviewDate).getTime() - new Date(b.reviewDate).getTime())
      .map(item => ({
        reviewDate: item.reviewDate,
        symptomSummary: item.symptomSummary,
        statusSummary: item.statusSummary,
        metricValues: item.metricValues,
        planAdjustment: item.planAdjustment,
      }))

    const metricSeries = this.buildChronicMetricSeries(timeline)

    return {
      caseInfo: chronicCase,
      summary: {
        followupCount: timeline.length,
        lastReviewDate: timeline.at(-1)?.reviewDate ?? null,
        nextReviewDate: chronicCase.nextReviewDate ?? null,
      },
      trackingSchema: chronicCase.trackingSchema ?? [],
      timeline,
      metricSeries,
    }
  }

  private mapVisitDetail(item: VisitEntity) {
    const diagnoses = item.diagnoses?.length
      ? item.diagnoses
          .slice()
          .sort((a, b) => a.sortNo - b.sortNo)
          .map(d => ({
            id: d.id,
            code: d.diagnosisCode,
            name: d.diagnosisName,
            type: this.mapDiagnosisTypeLabel(d.diagnosisType),
            isPrimary: d.isPrimary === 1,
            recordedBy: d.recordedBy,
            recorder: d.recorder,
          }))
      : (Array.isArray(item.diagnosis) ? item.diagnosis : [])

    const queueEvents = (item.queueEvents ?? [])
      .slice()
      .sort((a, b) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime())
      .map(event => ({
        id: event.id,
        eventType: event.eventType,
        queueNo: event.queueNo,
        operatorId: event.operatorId,
        eventTime: event.eventTime,
        remark: event.remark,
      }))

    const progressBatches = (item.progressBatches ?? [])
      .slice()
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map(batch => ({
        id: batch.id,
        batchNo: batch.batchNo,
        careStage: batch.careStage,
        symptomSummary: batch.symptomSummary,
        statusSummary: batch.statusSummary,
        physicalExam: batch.physicalExam,
        assessmentText: batch.assessmentText,
        diagnosisSnapshot: batch.diagnosisSnapshot,
        remark: batch.remark,
        recordedBy: batch.recordedBy,
        recorder: batch.recorder,
        createdAt: batch.createdAt,
      }))

    const planBatches = (item.planBatches ?? [])
      .slice()
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map(batch => ({
        id: batch.id,
        batchNo: batch.batchNo,
        careStage: batch.careStage,
        planSummary: batch.planSummary,
        doctorAdvice: batch.doctorAdvice,
        structuredActions: batch.structuredActions,
        followUpActions: batch.followUpActions,
        remark: batch.remark,
        recordedBy: batch.recordedBy,
        recorder: batch.recorder,
        createdAt: batch.createdAt,
      }))

    const careFollowups = (item.careFollowups ?? [])
      .slice()
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .map(batch => ({
        id: batch.id,
        batchNo: batch.batchNo,
        occurredAt: batch.occurredAt,
        careStage: batch.careStage,
        symptomSummary: batch.symptomSummary,
        statusSummary: batch.statusSummary,
        vitalSigns: batch.vitalSigns,
        objectiveNote: batch.objectiveNote,
        assessmentText: batch.assessmentText,
        planAdjustment: batch.planAdjustment,
        medicationAdjustment: batch.medicationAdjustment,
        remark: batch.remark,
        recordedBy: batch.recordedBy,
        recorder: batch.recorder,
        createdAt: batch.createdAt,
      }))

    const mediaBatches = (item.mediaBatches ?? [])
      .slice()
      .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime())
      .map(batch => this.mapMediaBatch(batch))

    return {
      ...item,
      chiefComplaint: item.emr?.chiefComplaint ?? item.chiefComplaint,
      physicalExam: item.emr?.physicalExam ?? item.physicalExam,
      assessmentText: item.emr?.assessmentText ?? null,
      treatmentPlan: item.emr?.planText ?? item.treatmentPlan,
      doctorAdvice: item.emr?.doctorAdvice ?? item.doctorAdvice,
      locked: item.emr?.locked ?? item.locked,
      diagnosis: diagnoses,
      diagnoses,
      progressBatches,
      planBatches,
      careFollowups,
      mediaBatches,
      queueEvents,
      currentQueueEvent: queueEvents.length > 0 ? queueEvents[queueEvents.length - 1] : null,
    }
  }

  private mapMediaBatch(item: VisitMediaBatchEntity) {
    return {
      id: item.id,
      visitId: item.visitId,
      batchNo: item.batchNo,
      capturedAt: item.capturedAt,
      operatorId: item.operatorId,
      operator: item.operator,
      relationType: item.relationType,
      careFollowupId: item.careFollowupId,
      careFollowup: item.careFollowup
        ? {
            id: item.careFollowup.id,
            batchNo: item.careFollowup.batchNo,
            occurredAt: item.careFollowup.occurredAt,
          }
        : null,
      remark: item.remark,
      files: (item.files ?? [])
        .slice()
        .sort((a, b) => (a.sortNo - b.sortNo) || (a.id - b.id))
        .map(file => ({
          id: file.id,
          batchId: file.batchId,
          visitId: file.visitId,
          fileType: file.fileType,
          storageType: file.storageType,
          fileName: file.fileName,
          originalName: file.originalName,
          url: file.url,
          mimeType: file.mimeType,
          fileSize: file.fileSize,
          sortNo: file.sortNo,
          remark: file.remark,
          createdAt: file.createdAt,
        })),
      createdAt: item.createdAt,
    }
  }

  private mapCareFollowup(item: VisitCareFollowupEntity) {
    const linkedLabs = (item.labLinks ?? [])
      .map(link => link.labOrder)
      .filter(Boolean)
      .map(lab => ({
        id: lab.id,
        orderNo: lab.orderNo,
        testName: lab.testName,
        sampleType: lab.sampleType,
        status: lab.status,
        reportedAt: lab.reportedAt,
        abnormalCount: lab.abnormalCount,
        reportSummary: lab.reportSummary,
        resultItems: (lab.resultItems ?? []).map(result => ({
          id: result.id,
          itemCode: result.itemCode,
          itemName: result.itemName,
          resultValue: result.resultValue,
          unit: result.unit,
          flag: result.flag,
          refMin: result.refMin,
          refMax: result.refMax,
        })),
      }))

    const linkedPrescriptions = (item.prescriptionLinks ?? [])
      .map(link => link.prescription)
      .filter(Boolean)
      .map(rx => ({
        id: rx.id,
        rxNo: rx.rxNo,
        batchNo: rx.batchNo,
        batchLabel: rx.batchLabel,
        status: rx.status,
        totalAmount: rx.totalAmount,
        details: (rx.details ?? []).map(detail => ({
          id: detail.id,
          itemKind: detail.itemKind,
          itemName: detail.itemName || detail.drugName,
          drugName: detail.drugName,
          specification: detail.specification,
          dosage: detail.dosage,
          dosageUnit: detail.dosageUnit,
          frequency: detail.frequency,
          quantity: detail.quantity,
        })),
      }))

    return {
      id: item.id,
      batchNo: item.batchNo,
      visitId: item.visitId,
      occurredAt: item.occurredAt,
      careStage: item.careStage,
      symptomSummary: item.symptomSummary,
      statusSummary: item.statusSummary,
      vitalSigns: item.vitalSigns,
      objectiveNote: item.objectiveNote,
      assessmentText: item.assessmentText,
      planAdjustment: item.planAdjustment,
      medicationAdjustment: item.medicationAdjustment,
      remark: item.remark,
      recordedBy: item.recordedBy,
      recorder: item.recorder,
      linkedLabs,
      linkedPrescriptions,
      createdAt: item.createdAt,
    }
  }

  private async ensureEmrForVisit(visit: VisitEntity) {
    let emr = visit.emr ?? await this.emrRepository.findOneBy({ visitId: visit.id, tenantId: visit.tenantId, areaId: visit.areaId })
    if (!emr) {
      emr = this.emrRepository.create({
        tenantId: visit.tenantId,
        areaId: visit.areaId,
        visitId: visit.id,
        chiefComplaint: visit.chiefComplaint ?? null,
        physicalExam: visit.physicalExam ?? null,
        assessmentText: null,
        planText: visit.treatmentPlan ?? null,
        doctorAdvice: visit.doctorAdvice ?? null,
        locked: visit.locked ?? 0,
      })
      emr = await this.emrRepository.save(emr)
    }
    return emr
  }

  private createEmrSnapshot(emr: VisitEmrEntity | null, visit?: VisitEntity | null) {
    if (!emr && !visit)
      return null
    return {
      visitId: visit?.id ?? emr?.visitId ?? null,
      visitNo: visit?.visitNo ?? null,
      status: visit?.status ?? null,
      careMode: visit?.careMode ?? null,
      careStage: visit?.careStage ?? null,
      locked: emr?.locked ?? visit?.locked ?? 0,
      lockedAt: emr?.lockedAt ?? null,
      chiefComplaint: emr?.chiefComplaint ?? visit?.chiefComplaint ?? null,
      physicalExam: emr?.physicalExam ?? visit?.physicalExam ?? null,
      assessmentText: emr?.assessmentText ?? null,
      diagnosis: visit?.diagnosis ?? null,
      treatmentPlan: emr?.planText ?? visit?.treatmentPlan ?? null,
      doctorAdvice: emr?.doctorAdvice ?? visit?.doctorAdvice ?? null,
    }
  }

  private async writeEmrAudit(
    visitId: number,
    emrId: number | null,
    action: string,
    beforeSnapshot: Record<string, any> | null,
    afterSnapshot: Record<string, any> | null,
    reason?: string | null,
    operatorId?: number | null,
    context?: Pick<IAuthUser, 'tenantId' | 'areaId'>,
  ) {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    await this.emrAuditRepository.save(this.emrAuditRepository.create({
      tenantId,
      areaId,
      visitId,
      emrId,
      action,
      beforeSnapshot,
      afterSnapshot,
      reason: reason ?? null,
      operatorId: operatorId ?? null,
    }))
  }

  private normalizeDiagnoses(value: any): Array<{ code?: string, name?: string, type?: string | number }> {
    if (!value)
      return []
    const list = Array.isArray(value) ? value : [value]
    return list
      .map((item: any) => {
        if (typeof item === 'string') {
          return { code: item, name: item, type: 'confirmed' }
        }

        return {
          code: item?.code,
          name: item?.name ?? item?.code,
          type: item?.type,
        }
      })
      .filter(item => item.code || item.name)
  }

  private resolveDiagnosisType(type?: string | number) {
    if (typeof type === 'number')
      return type
    if (type === 'suspected')
      return 2
    if (type === 'differential')
      return 3
    return 1
  }

  private mapDiagnosisTypeLabel(type?: number) {
    const mapping: Record<number, string> = {
      1: 'confirmed',
      2: 'suspected',
      3: 'differential',
    }
    return mapping[type ?? 1] ?? 'confirmed'
  }

  private async generateVisitNo(context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const date = this.getTodaySequenceDate()
    const prefix = `V${date}`
    const latestVisit = await this.visitRepository
      .createQueryBuilder('v')
      .select(['v.visitNo'])
      .where('v.visitNo LIKE :prefix', { prefix: `${prefix}%` })
      .andWhere('v.tenantId = :tenantId', { tenantId })
      .andWhere('v.areaId = :areaId', { areaId })
      .orderBy('v.visitNo', 'DESC')
      .getOne()

    const currentSeq = latestVisit?.visitNo
      ? Number(latestVisit.visitNo.slice(prefix.length)) || 0
      : 0
    return `${prefix}${String(currentSeq + 1).padStart(4, '0')}`
  }

  private async generateQueueNumber(context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const result = await this.visitRepository
      .createQueryBuilder('v')
      .select('MAX(v.queueNumber)', 'maxQueueNumber')
      .where('v.createdAt >= :today', { today })
      .andWhere('v.tenantId = :tenantId', { tenantId })
      .andWhere('v.areaId = :areaId', { areaId })
      .getRawOne<{ maxQueueNumber: number | string | null }>()

    return Number(result?.maxQueueNumber ?? 0) + 1
  }

  private getTodaySequenceDate() {
    const now = new Date()
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  }

  private isVisitNoDuplicateError(error: unknown) {
    if (!(error instanceof QueryFailedError))
      return false
    const message = String((error as any)?.message || '')
    return message.includes('Duplicate entry') && (message.includes('visit_no') || message.includes('IDX_72641dd435f6d5b3fadbb684b7'))
  }

  private async appendQueueEvent(
    visitId: number,
    eventType: number,
    payload?: {
      queueNo?: number | null
      operatorId?: number | null
      remark?: string | null
    },
    dedupeLatest = false,
    context?: Pick<IAuthUser, 'tenantId' | 'areaId'>,
  ) {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    if (dedupeLatest) {
      const latest = await this.queueEventRepository.findOne({
        where: { visitId },
        order: { eventTime: 'DESC', id: 'DESC' },
      })
      if (latest && Number(latest.eventType) === Number(eventType) && String(latest.remark || '') === String(payload?.remark || '')) {
        return
      }
    }

    await this.queueEventRepository.save(this.queueEventRepository.create({
      tenantId,
      areaId,
      visitId,
      eventType,
      queueNo: payload?.queueNo ?? null,
      operatorId: payload?.operatorId ?? null,
      eventTime: new Date().toISOString(),
      remark: payload?.remark ?? null,
    }))
  }

  private async saveProgressBatch(
    visit: VisitEntity,
    payload: {
      batchNo?: string
      careStage?: number
      symptomSummary?: string
      statusSummary?: string
      physicalExam?: Record<string, any>
      assessmentText?: string
      diagnosisSnapshot?: Array<Record<string, any>>
      recordedBy?: number | null
    },
  ) {
    const progressBatch = this.progressBatchRepository.create({
      tenantId: visit.tenantId,
      areaId: visit.areaId,
      visitId: visit.id,
      batchNo: payload.batchNo || await this.generateProgressBatchNo(visit),
      careStage: payload.careStage ?? visit.careStage ?? null,
      symptomSummary: payload.symptomSummary ?? null,
      statusSummary: payload.statusSummary ?? null,
      physicalExam: payload.physicalExam ?? null,
      assessmentText: payload.assessmentText ?? null,
      diagnosisSnapshot: payload.diagnosisSnapshot ?? null,
      recordedBy: payload.recordedBy ?? null,
    })
    await this.progressBatchRepository.save(progressBatch)
  }

  private async savePlanBatch(
    visit: VisitEntity,
    payload: {
      batchNo?: string
      careStage?: number
      planSummary?: string
      doctorAdvice?: string
      structuredActions?: Array<Record<string, any>>
      followUpActions?: Array<Record<string, any>>
      recordedBy?: number | null
    },
  ) {
    const planBatch = this.planBatchRepository.create({
      tenantId: visit.tenantId,
      areaId: visit.areaId,
      visitId: visit.id,
      batchNo: payload.batchNo || await this.generatePlanBatchNo(visit),
      careStage: payload.careStage ?? visit.careStage ?? null,
      planSummary: payload.planSummary ?? null,
      doctorAdvice: payload.doctorAdvice ?? null,
      structuredActions: payload.structuredActions ?? null,
      followUpActions: payload.followUpActions ?? null,
      recordedBy: payload.recordedBy ?? null,
    })
    await this.planBatchRepository.save(planBatch)
  }

  private normalizeIdList(value?: number[] | string | null) {
    if (!value)
      return []
    const raw = Array.isArray(value)
      ? value
      : JSON.parse(value)
    if (!Array.isArray(raw))
      return []
    return [...new Set(raw.map(item => Number(item)).filter(item => Number.isInteger(item) && item > 0))]
  }

  private async assertLabOrdersBelongToVisit(visit: VisitEntity, labOrderIds: number[]) {
    if (labOrderIds.length === 0)
      return
    const count = await this.labOrderRepository
      .createQueryBuilder('lab')
      .where('lab.id IN (:...labOrderIds)', { labOrderIds })
      .andWhere('lab.visitId = :visitId', { visitId: visit.id })
      .andWhere('lab.tenantId = :tenantId', { tenantId: visit.tenantId })
      .andWhere('lab.areaId = :areaId', { areaId: visit.areaId })
      .getCount()
    if (count !== labOrderIds.length)
      throw new BusinessException('Linked lab orders must belong to the current visit')
  }

  private async assertPrescriptionsBelongToVisit(visit: VisitEntity, prescriptionIds: number[]) {
    if (prescriptionIds.length === 0)
      return
    const count = await this.prescriptionRepository
      .createQueryBuilder('rx')
      .where('rx.id IN (:...prescriptionIds)', { prescriptionIds })
      .andWhere('rx.visitId = :visitId', { visitId: visit.id })
      .andWhere('rx.tenantId = :tenantId', { tenantId: visit.tenantId })
      .andWhere('rx.areaId = :areaId', { areaId: visit.areaId })
      .getCount()
    if (count !== prescriptionIds.length)
      throw new BusinessException('Linked prescriptions must belong to the current visit')
  }

  private async assertCareFollowupBelongsToVisit(visit: VisitEntity, careFollowupId: number) {
    const count = await this.careFollowupRepository.count({
      where: {
        id: careFollowupId,
        visitId: visit.id,
        tenantId: visit.tenantId,
        areaId: visit.areaId,
      },
    })
    if (count !== 1)
      throw new BusinessException('Care followup must belong to the current visit')
  }

  private async generateCareFollowupBatchNo(visit: VisitEntity) {
    const count = await this.careFollowupRepository.count({
      where: { visitId: visit.id, tenantId: visit.tenantId, areaId: visit.areaId },
    })
    return `C${String(count + 1).padStart(2, '0')}`
  }

  private async generateMediaBatchNo(visit: VisitEntity) {
    const prefix = `IMG${this.getTodaySequenceDate()}`
    const latest = await this.mediaBatchRepository
      .createQueryBuilder('batch')
      .select(['batch.batchNo'])
      .where('batch.batchNo LIKE :prefix', { prefix: `${prefix}%` })
      .andWhere('batch.tenantId = :tenantId', { tenantId: visit.tenantId })
      .andWhere('batch.areaId = :areaId', { areaId: visit.areaId })
      .orderBy('batch.batchNo', 'DESC')
      .getOne()
    const currentSeq = latest?.batchNo
      ? Number(latest.batchNo.slice(prefix.length)) || 0
      : 0
    const visitSuffix = visit?.visitNo ? `-${visit.visitNo}` : ''
    return `${prefix}${String(currentSeq + 1).padStart(4, '0')}${visitSuffix}`.slice(0, 30)
  }

  private async nextMediaFileSortNo(batchId: number) {
    const result = await this.mediaFileRepository
      .createQueryBuilder('file')
      .select('MAX(file.sortNo)', 'maxSortNo')
      .where('file.batchId = :batchId', { batchId })
      .getRawOne<{ maxSortNo: number | string | null }>()
    return Number(result?.maxSortNo ?? 0) + 1
  }

  private async generateProgressBatchNo(visit: VisitEntity) {
    const count = await this.progressBatchRepository.count({
      where: { visitId: visit.id, tenantId: visit.tenantId, areaId: visit.areaId },
    })
    return `P${String(count + 1).padStart(2, '0')}`
  }

  private async generatePlanBatchNo(visit: VisitEntity) {
    const count = await this.planBatchRepository.count({
      where: { visitId: visit.id, tenantId: visit.tenantId, areaId: visit.areaId },
    })
    return `T${String(count + 1).padStart(2, '0')}`
  }

  private async findScopedVisit(id: number, options: CurrentStaffScopeOptions = {}) {
    const { tenantId, areaId } = requireTenantAreaContext(options)
    return this.visitRepository.findOneBy({
      id,
      tenantId,
      areaId,
    })
  }

  private async resolveScopedDoctorId(scope?: string, currentUserId?: number, tenantId?: number) {
    if (scope !== 'currentStaff')
      return undefined
    const { tenantId: requiredTenantId } = requireTenantContext({ tenantId })
    if (!currentUserId)
      return null
    const doctor = await this.doctorRepository.findOne({
      where: { userId: currentUserId, tenantId: requiredTenantId, status: 1 },
    })
    return doctor?.id ?? null
  }

  private async resolveActorDoctorId(visit: VisitEntity, options: CurrentStaffScopeOptions = {}) {
    if (options.currentUserId) {
      const doctor = await this.doctorRepository.findOne({
        where: { userId: options.currentUserId, tenantId: visit.tenantId, status: 1 },
      })
      if (doctor)
        return doctor.id
    }
    return visit.doctorId ?? null
  }

  private async assertVisitBelongsToScopedDoctor(visit: VisitEntity, options: CurrentStaffScopeOptions = {}) {
    if (options.scope !== 'currentStaff')
      return

    const scopedDoctorId = await this.resolveScopedDoctorId(options.scope, options.currentUserId, visit.tenantId)
    if (!scopedDoctorId)
      throw new BusinessException('Current user is not bound to active medical staff')

    if (Number(visit.doctorId) !== Number(scopedDoctorId))
      throw new BusinessException('Current staff cannot access this visit')
  }

  private async generateChronicCaseNo(context: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const date = this.getTodaySequenceDate()
    const prefix = `CC${date}`
    const latestCase = await this.chronicCaseRepository
      .createQueryBuilder('c')
      .select(['c.caseNo'])
      .where('c.caseNo LIKE :prefix', { prefix: `${prefix}%` })
      .andWhere('c.tenantId = :tenantId', { tenantId })
      .andWhere('c.areaId = :areaId', { areaId })
      .orderBy('c.caseNo', 'DESC')
      .getOne()

    const currentSeq = latestCase?.caseNo
      ? Number(latestCase.caseNo.slice(prefix.length)) || 0
      : 0
    return `${prefix}${String(currentSeq + 1).padStart(4, '0')}`
  }

  private buildChronicMetricSeries(timeline: Array<{ reviewDate: string, metricValues?: Record<string, any> | null }>) {
    const result: Record<string, Array<{ date: string, value: any }>> = {}
    timeline.forEach((item) => {
      const metrics = item.metricValues || {}
      Object.entries(metrics).forEach(([key, value]) => {
        if (!result[key])
          result[key] = []
        result[key].push({
          date: item.reviewDate,
          value,
        })
      })
    })
    return result
  }
}
