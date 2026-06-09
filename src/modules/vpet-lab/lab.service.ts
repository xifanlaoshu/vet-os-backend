import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Brackets, Repository } from 'typeorm'
import { BusinessException } from '~/common/exceptions/biz.exception'
import { paginate } from '~/helper/paginate'
import { DoctorEntity } from '../vpet-appointment/entities/doctor.entity'
import { CustomerEntity } from '../vpet-customer/entities/customer.entity'
import { PetEntity } from '../vpet-pet/entities/pet.entity'
import { VisitEntity } from '../vpet-visit/entities/visit.entity'
import { CreateLabOrderDto, CreateLabTemplateDto, QueryLabOrderDto, SubmitLisOrderDto, UpdateLabReportDto, UpdateLabTemplateDto } from './dto/lab.dto'
import { LabOrderEntity } from './entities/lab-order.entity'
import { LabResultItemEntity } from './entities/lab-result-item.entity'
import { LabTemplateEntity } from './entities/lab-template.entity'
import { LisOrderEntity } from './entities/lis-order.entity'

@Injectable()
export class LabService {
  constructor(
    @InjectRepository(LabOrderEntity)
    private labOrderRepository: Repository<LabOrderEntity>,
    @InjectRepository(LabResultItemEntity)
    private labResultItemRepository: Repository<LabResultItemEntity>,
    @InjectRepository(LisOrderEntity)
    private lisOrderRepository: Repository<LisOrderEntity>,
    @InjectRepository(LabTemplateEntity)
    private labTemplateRepository: Repository<LabTemplateEntity>,
    @InjectRepository(VisitEntity)
    private visitRepository: Repository<VisitEntity>,
    @InjectRepository(CustomerEntity)
    private customerRepository: Repository<CustomerEntity>,
    @InjectRepository(PetEntity)
    private petRepository: Repository<PetEntity>,
    @InjectRepository(DoctorEntity)
    private doctorRepository: Repository<DoctorEntity>,
  ) {}

  async list(dto: QueryLabOrderDto) {
    const { page = 1, pageSize = 10, visitId, doctorId, status, keyword } = dto
    const qb = this.labOrderRepository.createQueryBuilder('lab')
      .leftJoinAndSelect('lab.pet', 'pet')
      .leftJoinAndSelect('lab.customer', 'customer')
      .leftJoinAndSelect('lab.doctor', 'doctor')
      .leftJoinAndSelect('lab.lisOrder', 'lisOrder')

    if (visitId)
      qb.andWhere('lab.visitId = :visitId', { visitId })
    if (doctorId)
      qb.andWhere('lab.doctorId = :doctorId', { doctorId })
    if (status !== undefined)
      qb.andWhere('lab.status = :status', { status })
    if (keyword) {
      qb.andWhere(new Brackets((subQb) => {
        subQb
          .where('lab.orderNo LIKE :keyword', { keyword: `%${keyword}%` })
          .orWhere('lab.testName LIKE :keyword', { keyword: `%${keyword}%` })
          .orWhere('pet.name LIKE :keyword', { keyword: `%${keyword}%` })
          .orWhere('customer.name LIKE :keyword', { keyword: `%${keyword}%` })
      }))
    }

    qb.orderBy('lab.createdAt', 'DESC')
    return paginate(qb, { page, pageSize })
  }

  async create(dto: CreateLabOrderDto) {
    const visit = await this.visitRepository.findOne({
      where: { id: dto.visitId },
      relations: ['customer', 'pet'],
    })
    if (!visit)
      throw new BusinessException('Visit not found')

    const template = dto.templateId
      ? await this.labTemplateRepository.findOneBy({ id: dto.templateId })
      : null

    const [customer, pet, doctor] = await Promise.all([
      this.customerRepository.findOneBy({ id: dto.customerId ?? visit.customerId }),
      this.petRepository.findOneBy({ id: dto.petId ?? visit.petId }),
      (dto.doctorId ?? visit.doctorId) ? this.doctorRepository.findOneBy({ id: dto.doctorId ?? visit.doctorId }) : Promise.resolve(null),
    ])

    if (!customer)
      throw new BusinessException('Customer not found')
    if (!pet)
      throw new BusinessException('Pet not found')
    if (Number(pet.customerId) !== Number(customer.id)) {
      throw new BusinessException('Pet does not belong to the selected customer')
    }
    if (doctor && visit.doctorId && Number(visit.doctorId) !== Number(doctor.id)) {
      throw new BusinessException('Lab doctor does not match visit doctor')
    }

    const order = this.labOrderRepository.create({
      orderNo: await this.generateLabOrderNo(),
      visitId: dto.visitId,
      customerId: customer.id,
      petId: pet.id,
      doctorId: dto.doctorId ?? visit.doctorId ?? null,
      templateId: template?.id ?? null,
      templateName: template?.name ?? null,
      testName: dto.testName || template?.name,
      category: dto.category ?? template?.category ?? 1,
      sampleType: dto.sampleType ?? template?.sampleType ?? null,
      sourceType: dto.sourceType ?? 'visit',
      sourceId: dto.sourceId ?? dto.visitId,
      status: 1,
      requestedAt: new Date().toISOString(),
      chargeAmount: dto.chargeAmount ?? Number(template?.defaultChargeAmount ?? 0),
      customerSnapshot: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
      },
      petSnapshot: {
        id: pet.id,
        name: pet.name,
        species: pet.species,
        breed: pet.breed,
        weight: pet.weight,
      },
      templateSnapshot: template
        ? {
            id: template.id,
            code: template.code,
            name: template.name,
            category: template.category,
            sampleType: template.sampleType,
            resultSchema: template.resultSchema,
            templateHeader: template.templateHeader,
            templateFooter: template.templateFooter,
          }
        : null,
      resultItems: this.resolveInitialItems(dto.items, template).flatMap((item, index) => this.labResultItemRepository.create({
        ...item,
        flag: item.flag ?? this.resolveFlag(item.resultValue, item.refMin, item.refMax),
        displayOrder: index,
      })),
    })

    const saved = await this.labOrderRepository.save(order)
    return this.getDetail(saved.id)
  }

  async getDetail(id: number) {
    return this.labOrderRepository.findOne({
      where: { id },
      relations: ['pet', 'customer', 'doctor', 'resultItems', 'lisOrder'],
    })
  }

  async saveReport(id: number, dto: UpdateLabReportDto) {
    const order = await this.labOrderRepository.findOne({
      where: { id },
      relations: ['resultItems'],
    })
    if (!order)
      throw new BusinessException('Lab order not found')

    await this.labResultItemRepository.delete({ labOrderId: id })
    const items = dto.items.map((item, index) => this.labResultItemRepository.create({
      labOrderId: id,
      itemCode: item.itemCode,
      itemName: item.itemName,
      resultValue: item.resultValue,
      unit: item.unit,
      refMin: item.refMin,
      refMax: item.refMax,
      flag: item.flag ?? this.resolveFlag(item.resultValue, item.refMin, item.refMax),
      displayOrder: index,
    }))
    await this.labResultItemRepository.save(items)

    const abnormalCount = items.filter(item => ['H', 'L'].includes(String(item.flag || '').toUpperCase())).length
    await this.labOrderRepository.update(id, {
      sampledAt: dto.sampledAt ?? order.sampledAt ?? new Date().toISOString(),
      reportedAt: dto.reportedAt ?? new Date().toISOString(),
      reportSummary: dto.reportSummary,
      abnormalCount,
      status: dto.status ?? 4,
      structuredReport: dto.structuredReport ?? order.structuredReport ?? null,
      rawReportFiles: dto.rawReportFiles ?? order.rawReportFiles ?? null,
    })

    const lisOrder = await this.lisOrderRepository.findOneBy({ labOrderId: id })
    if (lisOrder) {
      await this.lisOrderRepository.update(lisOrder.id, {
        status: 4,
        receivedAt: new Date().toISOString(),
      })
    }

    return this.getDetail(id)
  }

  async listTemplates() {
    return this.labTemplateRepository.find({
      where: { isActive: 1 },
      order: { category: 'ASC', name: 'ASC' },
    })
  }

  async createTemplate(dto: CreateLabTemplateDto) {
    const existing = await this.labTemplateRepository.findOneBy({ code: dto.code })
    if (existing)
      throw new BusinessException('Lab template code already exists')
    const template = this.labTemplateRepository.create({
      code: dto.code,
      name: dto.name,
      category: dto.category ?? 1,
      speciesScope: dto.speciesScope ?? null,
      sampleType: dto.sampleType ?? null,
      defaultChargeAmount: dto.defaultChargeAmount ?? 0,
      resultSchema: dto.resultSchema ?? null,
      templateHeader: dto.templateHeader ?? null,
      templateFooter: dto.templateFooter ?? null,
      description: dto.description ?? null,
      isActive: dto.isActive ?? 1,
    })
    return this.labTemplateRepository.save(template)
  }

  async updateTemplate(id: number, dto: UpdateLabTemplateDto) {
    const current = await this.labTemplateRepository.findOneBy({ id })
    if (!current)
      throw new BusinessException('Lab template not found')
    if (dto.code && dto.code !== current.code) {
      const existing = await this.labTemplateRepository.findOneBy({ code: dto.code })
      if (existing)
        throw new BusinessException('Lab template code already exists')
    }

    const payload: Partial<LabTemplateEntity> = {}
    if (dto.code !== undefined)
      payload.code = dto.code
    if (dto.name !== undefined)
      payload.name = dto.name
    if (dto.category !== undefined)
      payload.category = dto.category
    if (dto.speciesScope !== undefined)
      payload.speciesScope = dto.speciesScope || null
    if (dto.sampleType !== undefined)
      payload.sampleType = dto.sampleType || null
    if (dto.defaultChargeAmount !== undefined)
      payload.defaultChargeAmount = dto.defaultChargeAmount
    if (dto.resultSchema !== undefined)
      payload.resultSchema = dto.resultSchema
    if (dto.templateHeader !== undefined)
      payload.templateHeader = dto.templateHeader || null
    if (dto.templateFooter !== undefined)
      payload.templateFooter = dto.templateFooter || null
    if (dto.description !== undefined)
      payload.description = dto.description || null
    if (dto.isActive !== undefined)
      payload.isActive = dto.isActive

    if (Object.keys(payload).length > 0)
      await this.labTemplateRepository.update(id, payload)
    return this.labTemplateRepository.findOneBy({ id })
  }

  async disableTemplate(id: number) {
    const current = await this.labTemplateRepository.findOneBy({ id })
    if (!current)
      throw new BusinessException('Lab template not found')
    await this.labTemplateRepository.update(id, { isActive: 0 })
  }

  async submitLisOrder(id: number, dto: SubmitLisOrderDto) {
    const order = await this.labOrderRepository.findOneBy({ id })
    if (!order)
      throw new BusinessException('Lab order not found')

    let lisOrder = await this.lisOrderRepository.findOneBy({ labOrderId: id })
    if (!lisOrder) {
      lisOrder = this.lisOrderRepository.create({
        labOrderId: id,
        barcode: dto.barcode || await this.generateBarcode(),
        deviceCode: dto.deviceCode,
        status: 2,
        sentAt: new Date().toISOString(),
      })
    }
    else {
      lisOrder.barcode = dto.barcode || lisOrder.barcode
      lisOrder.deviceCode = dto.deviceCode ?? lisOrder.deviceCode
      lisOrder.status = 2
      lisOrder.sentAt = new Date().toISOString()
    }

    await this.lisOrderRepository.save(lisOrder)
    await this.labOrderRepository.update(id, { status: 2, sampledAt: order.sampledAt ?? new Date().toISOString() })
    return this.getDetail(id)
  }

  private resolveFlag(resultValue?: string, refMin?: number, refMax?: number) {
    const numeric = Number(resultValue)
    if (Number.isNaN(numeric) || refMin === undefined || refMax === undefined)
      return 'N'
    if (numeric < Number(refMin))
      return 'L'
    if (numeric > Number(refMax))
      return 'H'
    return 'N'
  }

  private resolveInitialItems(items: CreateLabOrderDto['items'], template: LabTemplateEntity | null) {
    if (items?.length)
      return items
    const schemaItems = template?.resultSchema && Array.isArray(template.resultSchema.items)
      ? template.resultSchema.items
      : []
    return schemaItems.map((item: any) => ({
      itemCode: item.itemCode ?? item.code,
      itemName: item.itemName ?? item.name,
      unit: item.unit,
      refMin: item.refMin,
      refMax: item.refMax,
      resultValue: item.resultValue,
      flag: item.flag,
    }))
  }

  private async generateLabOrderNo() {
    const date = this.getTodaySequenceDate()
    const prefix = `LAB${date}`
    const latestOrder = await this.labOrderRepository
      .createQueryBuilder('lab')
      .select(['lab.orderNo'])
      .where('lab.orderNo LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('lab.orderNo', 'DESC')
      .getOne()

    const currentSeq = latestOrder?.orderNo
      ? Number(latestOrder.orderNo.slice(prefix.length)) || 0
      : 0
    return `${prefix}${String(currentSeq + 1).padStart(4, '0')}`
  }

  private async generateBarcode() {
    const date = this.getTodaySequenceDate()
    const prefix = `BC${date}`
    const latestLisOrder = await this.lisOrderRepository
      .createQueryBuilder('lis')
      .select(['lis.barcode'])
      .where('lis.barcode LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('lis.barcode', 'DESC')
      .getOne()

    const currentSeq = latestLisOrder?.barcode
      ? Number(latestLisOrder.barcode.slice(prefix.length)) || 0
      : 0
    return `${prefix}${String(currentSeq + 1).padStart(5, '0')}`
  }

  private getTodaySequenceDate() {
    const now = new Date()
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  }
}
