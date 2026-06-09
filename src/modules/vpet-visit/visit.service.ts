import { createHash } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Brackets, QueryFailedError, Repository } from 'typeorm'
import { BusinessException } from '~/common/exceptions/biz.exception'
import { BaseService } from '~/helper/crud/base.service'
import { paginate } from '~/helper/paginate'
import { AppointmentEntity } from '../vpet-appointment/entities/appointment.entity'
import { CustomerEntity } from '../vpet-customer/entities/customer.entity'
import { PetEntity } from '../vpet-pet/entities/pet.entity'
import {
  CreateChronicCaseDto,
  CreateChronicFollowupDto,
  CreateVisitDto,
  LockEmrDto,
  QueryVisitDto,
  RequestUnlockEmrDto,
  ReviewUnlockEmrDto,
  SignEmrDto,
  UpdateVisitDto,
} from './dto/visit.dto'
import { ChronicCaseEntity } from './entities/chronic-case.entity'
import { ChronicFollowupEntity } from './entities/chronic-followup.entity'
import { DiagnosisCodeEntity } from './entities/diagnosis-code.entity'
import { ESignatureRecordEntity } from './entities/e-signature-record.entity'
import { EmrAuditLogEntity } from './entities/emr-audit-log.entity'
import { EmrUnlockRequestEntity } from './entities/emr-unlock-request.entity'
import { VisitDiagnosisEntity } from './entities/visit-diagnosis.entity'
import { VisitEmrEntity } from './entities/visit-emr.entity'
import { VisitPlanBatchEntity } from './entities/visit-plan-batch.entity'
import { VisitProgressBatchEntity } from './entities/visit-progress-batch.entity'
import { VisitQueueEventEntity } from './entities/visit-queue-event.entity'
import { VisitEntity } from './entities/visit.entity'

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
    @InjectRepository(CustomerEntity)
    private customerRepository: Repository<CustomerEntity>,
    @InjectRepository(PetEntity)
    private petRepository: Repository<PetEntity>,
  ) {
    super(visitRepository)
  }

  async createVisit(dto: CreateVisitDto): Promise<any> {
    if (dto.appointmentId) {
      const existing = await this.visitRepository.findOneBy({ appointmentId: dto.appointmentId })
      if (existing)
        return this.findOneDetailed(existing.id)
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const [visitNo, queueNumber] = await Promise.all([
        this.generateVisitNo(),
        this.generateQueueNumber(),
      ])

      try {
        const visit = this.visitRepository.create({
          ...dto,
          visitNo,
          queueNumber,
          status: 1,
          triageTime: new Date().toISOString(),
        })
        const saved = await this.visitRepository.save(visit)
        await this.appendQueueEvent(saved.id, 1, {
          queueNo: queueNumber,
          remark: 'checked_in',
        })
        return this.findOneDetailed(saved.id)
      }
      catch (error) {
        if (!this.isVisitNoDuplicateError(error) || attempt === 4)
          throw error
      }
    }

    throw new Error('Failed to create visit')
  }

  async queryList(dto: QueryVisitDto) {
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
    const qb = this.visitRepository.createQueryBuilder('v')
      .leftJoinAndSelect('v.pet', 'pet')
      .leftJoinAndSelect('v.customer', 'customer')
      .leftJoinAndSelect('v.doctor', 'doctor')
      .leftJoinAndSelect('v.emr', 'emr')

    if (appointmentId)
      qb.andWhere('v.appointmentId = :appointmentId', { appointmentId })
    if (petId)
      qb.andWhere('v.petId = :petId', { petId })
    if (customerId)
      qb.andWhere('v.customerId = :customerId', { customerId })
    if (doctorId)
      qb.andWhere('v.doctorId = :doctorId', { doctorId })
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

  async startConsultation(id: number): Promise<any> {
    const visit = await this.visitRepository.findOneBy({ id })
    if (!visit) {
      await this.findOne(id)
      return null
    }

    const now = new Date().toISOString()
    const latestStartEvent = await this.queueEventRepository.findOne({
      where: { visitId: id, eventType: 3 },
      order: { eventTime: 'DESC', id: 'DESC' },
    })

    if (Number(visit.status) === 3 && visit.startTime && latestStartEvent) {
      return this.findOneDetailed(id)
    }

    if (Number(visit.status) === 4 && visit.startTime) {
      return this.findOneDetailed(id)
    }

    if (!visit.callTime) {
      await this.appendQueueEvent(id, 2, {
        queueNo: visit.queueNumber,
        remark: 'called',
      }, true)
    }

    await this.visitRepository.update(id, {
      status: 3,
      startTime: visit.startTime ?? now,
      callTime: visit.callTime ?? now,
    })
    await this.appendQueueEvent(id, 3, {
      queueNo: visit.queueNumber,
      remark: 'consultation_started',
    }, true)
    return this.findOneDetailed(id)
  }

  async saveSoap(id: number, dto: UpdateVisitDto): Promise<void> {
    const visit = await this.visitRepository.findOneBy({ id })
    if (!visit) {
      await this.findOne(id)
      return
    }

    const currentEmr = await this.emrRepository.findOneBy({ visitId: id })
    if (Number(currentEmr?.locked ?? visit.locked ?? 0) === 1) {
      throw new BusinessException('EMR is locked. Please request unlock before editing.')
    }

    const physicalExam = dto.physicalExam ? JSON.parse(dto.physicalExam as string) : undefined
    const diagnosisList = dto.diagnosis ? this.normalizeDiagnoses(JSON.parse(dto.diagnosis as string)) : undefined
    const ongoingFlags = dto.ongoingFlags ? JSON.parse(dto.ongoingFlags as string) : undefined
    const structuredActions = dto.structuredActions ? JSON.parse(dto.structuredActions as string) : undefined
    const followUpActions = dto.followUpActions ? JSON.parse(dto.followUpActions as string) : undefined

    let emr = currentEmr
    if (!emr) {
      emr = this.emrRepository.create({
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
      await this.diagnosisRepository.delete({ visitId: id })
      if (diagnosisList.length > 0) {
        await this.diagnosisRepository.save(
          diagnosisList.map((item, index) =>
            this.diagnosisRepository.create({
              visitId: id,
              diagnosisCode: item.code ?? item.name ?? null,
              diagnosisName: item.name ?? item.code ?? `diagnosis-${index + 1}`,
              diagnosisType: this.resolveDiagnosisType(item.type),
              sortNo: index,
              isPrimary: index === 0 ? 1 : 0,
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
      await this.visitRepository.update(id, visitUpdate)
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
      })
    }
  }

  async lockEmr(id: number, dto: LockEmrDto) {
    const visit = await this.visitRepository.findOne({
      where: { id },
      relations: ['emr'],
    })
    if (!visit) {
      await this.findOne(id)
      return null
    }

    const emr = await this.ensureEmrForVisit(visit)
    if (Number(emr.locked) === 1 && Number(visit.locked) === 1) {
      return this.findOneDetailed(id)
    }

    const before = this.createEmrSnapshot(emr, visit)
    const now = new Date().toISOString()
    emr.locked = 1
    emr.lockedAt = now
    await this.emrRepository.save(emr)
    await this.visitRepository.update(id, { locked: 1 })

    const after = this.createEmrSnapshot(emr, { ...visit, locked: 1 } as VisitEntity)
    await this.writeEmrAudit(id, emr.id, 'lock', before, after, dto.reason, dto.operatorId)
    return this.findOneDetailed(id)
  }

  async requestUnlockEmr(id: number, dto: RequestUnlockEmrDto) {
    const visit = await this.visitRepository.findOne({
      where: { id },
      relations: ['emr'],
    })
    if (!visit) {
      await this.findOne(id)
      return null
    }

    const emr = await this.ensureEmrForVisit(visit)
    if (Number(emr.locked ?? visit.locked ?? 0) !== 1) {
      throw new BusinessException('EMR is not locked')
    }

    const pending = await this.emrUnlockRequestRepository.findOne({
      where: { visitId: id, requestStatus: 1 },
      order: { id: 'DESC' },
    })
    if (pending)
      return pending

    const request = await this.emrUnlockRequestRepository.save(this.emrUnlockRequestRepository.create({
      visitId: id,
      emrId: emr.id,
      requestReason: dto.reason,
      requestedBy: dto.operatorId ?? null,
      requestStatus: 1,
    }))

    await this.writeEmrAudit(
      id,
      emr.id,
      'unlock_requested',
      this.createEmrSnapshot(emr, visit),
      this.createEmrSnapshot(emr, visit),
      dto.reason,
      dto.operatorId,
    )
    return request
  }

  async reviewUnlockRequest(requestId: number, dto: ReviewUnlockEmrDto) {
    const request = await this.emrUnlockRequestRepository.findOneBy({ id: requestId })
    if (!request)
      throw new BusinessException('Unlock request not found')
    if (Number(request.requestStatus) !== 1) {
      throw new BusinessException('Unlock request has already been reviewed')
    }
    if (![2, 3].includes(Number(dto.status))) {
      throw new BusinessException('Unlock review status must be approved or rejected')
    }

    const visit = await this.visitRepository.findOne({
      where: { id: request.visitId },
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
      await this.visitRepository.update(request.visitId, { locked: 0 })
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
    )
    return request
  }

  async signEmr(id: number, dto: SignEmrDto) {
    const visit = await this.visitRepository.findOne({
      where: { id },
      relations: ['emr', 'diagnoses', 'progressBatches', 'planBatches'],
    })
    if (!visit) {
      await this.findOne(id)
      return null
    }

    const emr = await this.ensureEmrForVisit(visit)
    const before = this.createEmrSnapshot(emr, visit)
    const signedAt = new Date().toISOString()
    const signedSnapshot = this.createEmrSnapshot(emr, visit)
    const signatureHash = createHash('sha256')
      .update(JSON.stringify({ signedAt, signedBy: dto.operatorId ?? null, signedSnapshot }))
      .digest('hex')

    const signature = await this.eSignatureRepository.save(this.eSignatureRepository.create({
      visitId: id,
      emrId: emr.id,
      signType: dto.signType ?? 'doctor',
      signatureHash,
      signedBy: dto.operatorId ?? null,
      signedAt,
      signedSnapshot,
      status: 1,
    }))

    emr.locked = 1
    emr.lockedAt = signedAt
    await this.emrRepository.save(emr)
    await this.visitRepository.update(id, { locked: 1 })

    await this.writeEmrAudit(
      id,
      emr.id,
      'signed',
      before,
      this.createEmrSnapshot(emr, { ...visit, locked: 1 } as VisitEntity),
      dto.reason,
      dto.operatorId,
    )
    return signature
  }

  async listEmrAuditLogs(visitId: number) {
    return this.emrAuditRepository.find({
      where: { visitId },
      order: { createdAt: 'DESC', id: 'DESC' },
    })
  }

  async listUnlockRequests(params: { visitId?: number, status?: number }) {
    const qb = this.emrUnlockRequestRepository.createQueryBuilder('r')
    if (params.visitId)
      qb.andWhere('r.visitId = :visitId', { visitId: params.visitId })
    if (params.status !== undefined)
      qb.andWhere('r.requestStatus = :status', { status: params.status })
    return qb.orderBy('r.createdAt', 'DESC').addOrderBy('r.id', 'DESC').getMany()
  }

  async listSignatures(visitId: number) {
    return this.eSignatureRepository.find({
      where: { visitId },
      order: { signedAt: 'DESC', id: 'DESC' },
    })
  }

  async endConsultation(id: number): Promise<void> {
    const visit = await this.visitRepository.findOneBy({ id })
    if (!visit) {
      await this.findOne(id)
      return
    }
    if (Number(visit.status) === 4 && visit.endTime) {
      return
    }

    const now = new Date().toISOString()
    await this.visitRepository.update(id, {
      status: 4,
      endTime: now,
    })
    await this.appendQueueEvent(id, 4, {
      queueNo: visit.queueNumber,
      remark: 'consultation_finished',
    }, true)

    if (visit.appointmentId) {
      await this.appointmentRepository.update(visit.appointmentId, { status: 3 })
    }
  }

  async getTodayQueue(doctorId?: number) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const qb = this.visitRepository.createQueryBuilder('v')
      .leftJoinAndSelect('v.pet', 'pet')
      .leftJoinAndSelect('v.customer', 'customer')
      .leftJoinAndSelect('v.doctor', 'doctor')
      .where('v.createdAt >= :today', { today })
      .andWhere('v.status IN (:...statuses)', { statuses: [1, 2, 3] })
      .orderBy('v.status', 'ASC')
      .addOrderBy('v.createdAt', 'ASC')

    if (doctorId)
      qb.andWhere('v.doctorId = :doctorId', { doctorId })
    const visits = await qb.getMany()
    return visits.map(item => this.mapVisitDetail(item))
  }

  async searchDiagnosisCodes(params: { keyword?: string, species?: string }) {
    const { keyword, species } = params
    const qb = this.diagnosisCodeRepository.createQueryBuilder('d')

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

  async findOneDetailed(id: number): Promise<any> {
    const item = await this.visitRepository.findOne({
      where: { id },
      relations: ['pet', 'customer', 'doctor', 'emr', 'diagnoses', 'queueEvents', 'progressBatches', 'planBatches'],
    })
    if (!item) {
      await this.findOne(id)
      return null
    }

    return this.mapVisitDetail(item)
  }

  async findByAppointmentId(appointmentId: number): Promise<any> {
    const visit = await this.visitRepository.findOneBy({ appointmentId })
    if (!visit)
      return null
    return this.findOneDetailed(visit.id)
  }

  async createChronicCase(dto: CreateChronicCaseDto) {
    const visit = dto.visitId
      ? await this.visitRepository.findOne({
        where: { id: dto.visitId },
        relations: ['customer', 'pet'],
      })
      : null
    const customerId = visit?.customerId ?? dto.customerId
    const petId = visit?.petId ?? dto.petId

    const [customer, pet] = await Promise.all([
      visit?.customer ? Promise.resolve(visit.customer) : this.customerRepository.findOneBy({ id: customerId }),
      visit?.pet ? Promise.resolve(visit.pet) : this.petRepository.findOneBy({ id: petId }),
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
      caseNo: await this.generateChronicCaseNo(),
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

  async addChronicFollowup(chronicCaseId: number, dto: CreateChronicFollowupDto) {
    const chronicCase = await this.chronicCaseRepository.findOneBy({ id: chronicCaseId })
    if (!chronicCase) {
      throw new BusinessException('Chronic case not found')
    }

    if (dto.visitId) {
      const visit = await this.visitRepository.findOneBy({ id: dto.visitId })
      if (!visit) {
        throw new BusinessException('Visit not found')
      }
      if (Number(visit.petId) !== Number(chronicCase.petId)) {
        throw new BusinessException('Visit does not belong to the same pet')
      }
    }

    const followup = this.chronicFollowupRepository.create({
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

    await this.chronicCaseRepository.update(chronicCaseId, {
      nextReviewDate: dto.nextReviewDate ?? chronicCase.nextReviewDate ?? null,
    })

    return this.getChronicCaseDetail(chronicCaseId)
  }

  async listChronicCases(params: {
    petId?: number
    customerId?: number
    status?: number
    keyword?: string
  }) {
    const { petId, customerId, status, keyword } = params
    const qb = this.chronicCaseRepository.createQueryBuilder('c')
      .leftJoinAndSelect('c.customer', 'customer')
      .leftJoinAndSelect('c.pet', 'pet')
      .leftJoinAndSelect('c.visit', 'visit')
      .leftJoinAndSelect('c.followups', 'followups')

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

  async getChronicCaseDetail(id: number) {
    return this.chronicCaseRepository.findOne({
      where: { id },
      relations: ['customer', 'pet', 'visit', 'followups'],
      order: { followups: { reviewDate: 'DESC' } },
    })
  }

  async getChronicReport(id: number) {
    const chronicCase = await this.chronicCaseRepository.findOne({
      where: { id },
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
        createdAt: batch.createdAt,
      }))

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
      queueEvents,
      currentQueueEvent: queueEvents.length > 0 ? queueEvents[queueEvents.length - 1] : null,
    }
  }

  private async ensureEmrForVisit(visit: VisitEntity) {
    let emr = visit.emr ?? await this.emrRepository.findOneBy({ visitId: visit.id })
    if (!emr) {
      emr = this.emrRepository.create({
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
  ) {
    await this.emrAuditRepository.save(this.emrAuditRepository.create({
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

  private async generateVisitNo() {
    const date = this.getTodaySequenceDate()
    const prefix = `V${date}`
    const latestVisit = await this.visitRepository
      .createQueryBuilder('v')
      .select(['v.visitNo'])
      .where('v.visitNo LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('v.visitNo', 'DESC')
      .getOne()

    const currentSeq = latestVisit?.visitNo
      ? Number(latestVisit.visitNo.slice(prefix.length)) || 0
      : 0
    return `${prefix}${String(currentSeq + 1).padStart(4, '0')}`
  }

  private async generateQueueNumber() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const result = await this.visitRepository
      .createQueryBuilder('v')
      .select('MAX(v.queueNumber)', 'maxQueueNumber')
      .where('v.createdAt >= :today', { today })
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
  ) {
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
    },
  ) {
    const progressBatch = this.progressBatchRepository.create({
      visitId: visit.id,
      batchNo: payload.batchNo || await this.generateProgressBatchNo(visit.id),
      careStage: payload.careStage ?? visit.careStage ?? null,
      symptomSummary: payload.symptomSummary ?? null,
      statusSummary: payload.statusSummary ?? null,
      physicalExam: payload.physicalExam ?? null,
      assessmentText: payload.assessmentText ?? null,
      diagnosisSnapshot: payload.diagnosisSnapshot ?? null,
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
    },
  ) {
    const planBatch = this.planBatchRepository.create({
      visitId: visit.id,
      batchNo: payload.batchNo || await this.generatePlanBatchNo(visit.id),
      careStage: payload.careStage ?? visit.careStage ?? null,
      planSummary: payload.planSummary ?? null,
      doctorAdvice: payload.doctorAdvice ?? null,
      structuredActions: payload.structuredActions ?? null,
      followUpActions: payload.followUpActions ?? null,
    })
    await this.planBatchRepository.save(planBatch)
  }

  private async generateProgressBatchNo(visitId: number) {
    const count = await this.progressBatchRepository.count({ where: { visitId } })
    return `P${String(count + 1).padStart(2, '0')}`
  }

  private async generatePlanBatchNo(visitId: number) {
    const count = await this.planBatchRepository.count({ where: { visitId } })
    return `T${String(count + 1).padStart(2, '0')}`
  }

  private async generateChronicCaseNo() {
    const date = this.getTodaySequenceDate()
    const prefix = `CC${date}`
    const latestCase = await this.chronicCaseRepository
      .createQueryBuilder('c')
      .select(['c.caseNo'])
      .where('c.caseNo LIKE :prefix', { prefix: `${prefix}%` })
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
