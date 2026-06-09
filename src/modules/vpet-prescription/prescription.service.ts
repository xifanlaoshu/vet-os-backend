import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Brackets, Repository } from 'typeorm'
import { BusinessException } from '~/common/exceptions/biz.exception'
import { BaseService } from '~/helper/crud/base.service'
import { paginate } from '~/helper/paginate'
import { DoctorEntity } from '../vpet-appointment/entities/doctor.entity'
import { ChargeItemEntity } from '../vpet-pharmacy/entities/charge-item.entity'
import { DrugEntity } from '../vpet-pharmacy/entities/drug.entity'
import { PharmacyService } from '../vpet-pharmacy/pharmacy.service'
import { VisitEntity } from '../vpet-visit/entities/visit.entity'
import {
  CreatePrescriptionDto,
  CreatePrescriptionTemplateDto,
  DispensePrescriptionDto,
  QueryPrescriptionDto,
  QueryPrescriptionTemplateDto,
  ReviewPrescriptionDto,
  UpdatePrescriptionTemplateDto,
} from './dto/prescription.dto'
import { PrescriptionTemplateItemEntity } from './entities/prescription-template-item.entity'
import { PrescriptionTemplateEntity } from './entities/prescription-template.entity'
import { PrescriptionEntity } from './entities/prescription.entity'
import { RxDetailEntity } from './entities/rx-detail.entity'

@Injectable()
export class PrescriptionService extends BaseService<PrescriptionEntity> {
  constructor(
    @InjectRepository(PrescriptionEntity)
    private rxRepository: Repository<PrescriptionEntity>,
    @InjectRepository(RxDetailEntity)
    private detailRepository: Repository<RxDetailEntity>,
    @InjectRepository(PrescriptionTemplateEntity)
    private templateRepository: Repository<PrescriptionTemplateEntity>,
    @InjectRepository(PrescriptionTemplateItemEntity)
    private templateItemRepository: Repository<PrescriptionTemplateItemEntity>,
    @InjectRepository(VisitEntity)
    private visitRepository: Repository<VisitEntity>,
    @InjectRepository(DrugEntity)
    private drugRepository: Repository<DrugEntity>,
    @InjectRepository(ChargeItemEntity)
    private chargeItemRepository: Repository<ChargeItemEntity>,
    @InjectRepository(DoctorEntity)
    private doctorRepository: Repository<DoctorEntity>,
    private pharmacyService: PharmacyService,
  ) {
    super(rxRepository)
  }

  async createRx(dto: CreatePrescriptionDto): Promise<PrescriptionEntity | null> {
    const visit = await this.visitRepository.findOne({
      where: { id: dto.visitId },
      relations: ['customer', 'pet'],
    })
    if (!visit)
      throw new BusinessException('Visit not found')
    const resolvedDoctorId = dto.doctorId ?? visit.doctorId
    if (!resolvedDoctorId)
      throw new BusinessException('Doctor is required for prescription')
    if (visit.doctorId && Number(visit.doctorId) !== Number(resolvedDoctorId)) {
      throw new BusinessException('Prescription doctor does not match visit doctor')
    }

    const doctor = await this.doctorRepository.findOneBy({ id: resolvedDoctorId })
    if (!doctor)
      throw new BusinessException('Doctor not found')

    const rxNo = await this.generateRxNo()
    const batchNo = dto.batchNo || await this.generateBatchNo(dto.visitId)
    let totalAmount = 0
    const details = await Promise.all(dto.details.map(async (detail) => {
      const resolved = await this.resolvePrescriptionItem(detail)
      const unitPrice = Number(detail.unitPrice ?? resolved.unitPrice ?? 0)
      const amount = Number(detail.quantity ?? 0) * unitPrice
      totalAmount += amount
      return this.detailRepository.create({
        ...detail,
        itemKind: resolved.itemKind,
        itemId: resolved.itemId,
        itemName: resolved.itemName,
        drugId: resolved.drugId,
        chargeItemId: resolved.chargeItemId,
        drugName: resolved.itemName,
        specification: detail.specification ?? resolved.specification,
        dosageUnit: detail.dosageUnit ?? resolved.dosageUnit ?? null,
        unitPrice,
        amount,
      })
    }))

    const rx = this.rxRepository.create({
      rxNo,
      visitId: dto.visitId,
      customerId: dto.customerId ?? visit.customerId ?? null,
      petId: dto.petId ?? visit.petId ?? null,
      hospitalizationId: dto.hospitalizationId ?? null,
      type: dto.type ?? 1,
      status: 1,
      doctorId: resolvedDoctorId,
      batchNo,
      batchLabel: dto.batchLabel ?? `第${batchNo.replace(/^B/, '')}批`,
      sourceType: dto.sourceType ?? 'visit',
      sourceId: dto.sourceId ?? dto.visitId,
      diagnosisSummary: dto.diagnosisSummary ?? this.resolveDiagnosisSummary(visit.diagnosis),
      totalAmount,
      customerSnapshot: visit.customer
        ? { id: visit.customer.id, name: visit.customer.name, phone: visit.customer.phone }
        : null,
      petSnapshot: visit.pet
        ? { id: visit.pet.id, name: visit.pet.name, species: visit.pet.species, breed: visit.pet.breed }
        : null,
      doctorSnapshot: { id: doctor.id, name: doctor.name, department: doctor.department },
      details,
    })

    const saved = await this.rxRepository.save(rx)
    return this.getDetail(saved.id)
  }

  async queryList(dto: QueryPrescriptionDto) {
    const { page = 1, pageSize = 10, visitId, doctorId, status } = dto
    const qb = this.rxRepository.createQueryBuilder('rx')

    if (visitId)
      qb.andWhere('rx.visitId = :visitId', { visitId })
    if (doctorId)
      qb.andWhere('rx.doctorId = :doctorId', { doctorId })
    if (status !== undefined)
      qb.andWhere('rx.status = :status', { status })

    qb.orderBy('rx.createdAt', 'DESC')
    return paginate(qb, { page, pageSize })
  }

  async submitForReview(id: number): Promise<void> {
    await this.rxRepository.update(id, { status: 2 })
  }

  async reviewRx(id: number, dto: ReviewPrescriptionDto): Promise<void> {
    await this.rxRepository.update(id, {
      status: dto.status,
      pharmacistId: dto.pharmacistId,
      reviewedAt: new Date().toISOString(),
    })
  }

  async dispenseRx(id: number, dto: DispensePrescriptionDto): Promise<PrescriptionEntity | null> {
    const rx = await this.getDetail(id)
    if (!rx)
      return null
    if (Number(rx.status) === 5)
      throw new BusinessException('Prescription is cancelled')
    if (Number(rx.status) === 4)
      return rx
    if (!rx.details?.length)
      throw new BusinessException('Prescription has no details')

    const requiredStock = rx.details.reduce<Record<number, number>>((acc, detail) => {
      if (this.isDrugDetail(detail) && detail.drugId) {
        acc[detail.drugId] = Number(acc[detail.drugId] || 0) + Number(detail.quantity || 0)
      }
      return acc
    }, {})

    for (const [drugIdText, quantity] of Object.entries(requiredStock)) {
      const available = await this.pharmacyService.getTotalStock(Number(drugIdText))
      if (available < quantity) {
        throw new BusinessException(`Insufficient stock for drug ${drugIdText}`)
      }
    }

    for (const detail of rx.details) {
      if (!this.isDrugDetail(detail))
        continue
      if (!detail.drugId) {
        throw new BusinessException(`Prescription detail ${detail.id} has no linked drug`)
      }
      await this.pharmacyService.stockOut(detail.drugId, Number(detail.quantity ?? 0), {
        txnType: 2,
        refType: 'prescription',
        refId: rx.id,
        operatorId: dto.pharmacistId ?? null,
      })
    }

    await this.rxRepository.update(id, {
      status: 4,
      pharmacistId: dto.pharmacistId ?? rx.pharmacistId ?? null,
      reviewedAt: rx.reviewedAt ?? new Date().toISOString(),
      dispensedAt: new Date().toISOString(),
    })
    return this.getDetail(id)
  }

  async getByVisit(visitId: number): Promise<PrescriptionEntity[]> {
    return this.rxRepository.find({
      where: { visitId },
      relations: ['details'],
      order: { createdAt: 'DESC' },
    })
  }

  async getStockTransactions(id: number) {
    const result = await this.pharmacyService.listStockTxns({
      page: 1,
      pageSize: 100,
      refType: 'prescription',
      refId: id,
    })
    return result.items
  }

  async getDetail(id: number): Promise<PrescriptionEntity | null> {
    return this.rxRepository.findOne({
      where: { id },
      relations: ['details'],
    })
  }

  async listTemplates(dto: QueryPrescriptionTemplateDto) {
    const { page = 1, pageSize = 10, keyword, category, speciesScope, status } = dto
    const qb = this.templateRepository.createQueryBuilder('t')
      .leftJoinAndSelect('t.items', 'items')

    if (keyword) {
      qb.andWhere(new Brackets((subQb) => {
        subQb
          .where('t.templateCode LIKE :keyword', { keyword: `%${keyword}%` })
          .orWhere('t.templateName LIKE :keyword', { keyword: `%${keyword}%` })
          .orWhere('t.description LIKE :keyword', { keyword: `%${keyword}%` })
      }))
    }
    if (category)
      qb.andWhere('t.category = :category', { category })
    if (speciesScope)
      qb.andWhere('(t.speciesScope = :speciesScope OR t.speciesScope IS NULL)', { speciesScope })
    if (status !== undefined)
      qb.andWhere('t.status = :status', { status: Number(status) })

    qb.orderBy('t.createdAt', 'DESC').addOrderBy('items.sortNo', 'ASC')
    return paginate(qb, { page, pageSize })
  }

  async getTemplate(id: number) {
    const template = await this.templateRepository.findOne({
      where: { id },
      relations: ['items'],
      order: { items: { sortNo: 'ASC' } },
    })
    if (!template)
      throw new BusinessException('Prescription template not found')
    return template
  }

  async createTemplate(dto: CreatePrescriptionTemplateDto) {
    const items = await this.buildTemplateItems(dto.items)
    const template = this.templateRepository.create({
      templateCode: dto.templateCode,
      templateName: dto.templateName,
      category: dto.category ?? null,
      speciesScope: dto.speciesScope ?? null,
      status: dto.status ?? 1,
      description: dto.description ?? null,
      items,
    })
    return this.templateRepository.save(template)
  }

  async updateTemplate(id: number, dto: UpdatePrescriptionTemplateDto) {
    const template = await this.templateRepository.findOne({
      where: { id },
      relations: ['items'],
    })
    if (!template)
      throw new BusinessException('Prescription template not found')

    if (dto.templateCode !== undefined)
      template.templateCode = dto.templateCode
    if (dto.templateName !== undefined)
      template.templateName = dto.templateName
    if (dto.category !== undefined)
      template.category = dto.category ?? null
    if (dto.speciesScope !== undefined)
      template.speciesScope = dto.speciesScope ?? null
    if (dto.status !== undefined)
      template.status = dto.status
    if (dto.description !== undefined)
      template.description = dto.description ?? null

    if (dto.items) {
      await this.templateItemRepository.delete({ templateId: id })
      template.items = await this.buildTemplateItems(dto.items)
    }

    return this.templateRepository.save(template)
  }

  async deleteTemplate(id: number) {
    await this.templateRepository.delete(id)
  }

  private async buildTemplateItems(items: CreatePrescriptionTemplateDto['items']) {
    if (!items?.length)
      throw new BusinessException('Prescription template must include at least one item')

    return Promise.all(items.map(async (item, index) => {
      const resolved = await this.resolvePrescriptionItem(item)

      return this.templateItemRepository.create({
        itemKind: resolved.itemKind,
        itemId: resolved.itemId,
        itemName: resolved.itemName,
        drugId: resolved.drugId,
        chargeItemId: resolved.chargeItemId,
        drugName: resolved.itemName,
        specification: item.specification ?? resolved.specification ?? null,
        dosage: item.dosage ?? null,
        dosageFormula: item.dosageFormula ?? null,
        dosageUnit: item.dosageUnit ?? resolved.dosageUnit ?? null,
        frequency: item.frequency ?? null,
        route: item.route ?? null,
        duration: item.duration ?? null,
        quantity: Number(item.quantity ?? 1),
        quantityFormula: item.quantityFormula ?? null,
        unitPrice: Number(item.unitPrice ?? resolved.unitPrice ?? 0),
        remark: item.remark ?? null,
        sortNo: item.sortNo ?? index,
      })
    }))
  }

  private async resolvePrescriptionItem(detail: {
    itemKind?: number
    itemId?: number
    itemName?: string
    drugId?: number
    chargeItemId?: number
    drugName?: string
  }) {
    const itemKind = Number(detail.itemKind ?? (detail.chargeItemId ? 2 : 1))
    if (itemKind === 2) {
      const chargeItemId = detail.chargeItemId ?? detail.itemId
      if (!chargeItemId)
        throw new BusinessException('Charge item id is required for service prescription details')
      const item = await this.chargeItemRepository.findOneBy({ id: chargeItemId })
      if (!item)
        throw new BusinessException(`Charge item not found: ${chargeItemId}`)
      return {
        itemKind: 2,
        itemId: item.id,
        itemName: item.itemName,
        drugId: null,
        chargeItemId: item.id,
        specification: item.specification,
        dosageUnit: item.unit,
        unitPrice: Number(item.retailPrice ?? 0),
      }
    }

    const drugId = detail.drugId ?? detail.itemId
    if (!drugId)
      throw new BusinessException('Drug id is required for prescription details')
    const drug = await this.drugRepository.findOneBy({ id: drugId })
    if (!drug)
      throw new BusinessException(`Drug not found: ${drugId}`)
    return {
      itemKind: 1,
      itemId: drug.id,
      itemName: drug.drugName,
      drugId: drug.id,
      chargeItemId: null,
      specification: drug.specification,
      dosageUnit: this.pharmacyService.getDosageUnit(drug),
      unitPrice: this.pharmacyService.getDosageUnitPrice(drug),
    }
  }

  private isDrugDetail(detail: RxDetailEntity) {
    return Number(detail.itemKind ?? (detail.drugId ? 1 : 2)) === 1
  }

  private async generateRxNo() {
    const date = this.getTodaySequenceDate()
    const prefix = `RX${date}`
    const latestPrescription = await this.rxRepository
      .createQueryBuilder('rx')
      .select(['rx.rxNo'])
      .where('rx.rxNo LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('rx.rxNo', 'DESC')
      .getOne()

    const currentSeq = latestPrescription?.rxNo
      ? Number(latestPrescription.rxNo.slice(prefix.length)) || 0
      : 0
    return `${prefix}${String(currentSeq + 1).padStart(4, '0')}`
  }

  private async generateBatchNo(visitId: number) {
    const count = await this.rxRepository.count({ where: { visitId } })
    return `B${String(count + 1).padStart(2, '0')}`
  }

  private resolveDiagnosisSummary(diagnosis: unknown) {
    if (!Array.isArray(diagnosis))
      return null
    return diagnosis
      .map((item: any) => item?.name || item?.code)
      .filter(Boolean)
      .join(' / ') || null
  }

  private getTodaySequenceDate() {
    const now = new Date()
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  }
}
