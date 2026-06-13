import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Brackets, Repository } from 'typeorm'
import { BusinessException } from '~/common/exceptions/biz.exception'
import { requireTenantAreaContext, requireTenantContext } from '~/common/utils/tenant-context.util'
import { paginate } from '~/helper/paginate'
import { DoctorEntity } from '../vpet-appointment/entities/doctor.entity'
import { CustomerEntity } from '../vpet-customer/entities/customer.entity'
import { PetEntity } from '../vpet-pet/entities/pet.entity'
import { VisitEntity } from '../vpet-visit/entities/visit.entity'
import { CreateConsentRecordDto, CreateConsentTemplateDto, QueryConsentRecordDto, QueryConsentTemplateDto, SignConsentRecordDto, UpdateConsentTemplateDto } from './dto/consent.dto'
import { ConsentRecordEntity } from './entities/consent-record.entity'
import { ConsentTemplateEntity } from './entities/consent-template.entity'

@Injectable()
export class ConsentService {
  constructor(
    @InjectRepository(ConsentTemplateEntity)
    private templateRepository: Repository<ConsentTemplateEntity>,
    @InjectRepository(ConsentRecordEntity)
    private recordRepository: Repository<ConsentRecordEntity>,
    @InjectRepository(VisitEntity)
    private visitRepository: Repository<VisitEntity>,
    @InjectRepository(CustomerEntity)
    private customerRepository: Repository<CustomerEntity>,
    @InjectRepository(PetEntity)
    private petRepository: Repository<PetEntity>,
    @InjectRepository(DoctorEntity)
    private doctorRepository: Repository<DoctorEntity>,
  ) {}

  async listTemplates(dto: QueryConsentTemplateDto, context?: Pick<IAuthUser, 'tenantId'>) {
    const { page = 1, pageSize = 10, category, keyword, isActive } = dto
    const { tenantId } = requireTenantContext(context)
    const qb = this.templateRepository.createQueryBuilder('tpl')
      .where('tpl.tenantId = :tenantId', { tenantId })

    if (category)
      qb.andWhere('tpl.category = :category', { category })
    if (isActive !== undefined)
      qb.andWhere('tpl.isActive = :isActive', { isActive })
    if (keyword) {
      qb.andWhere(new Brackets((subQb) => {
        subQb
          .where('tpl.code LIKE :keyword', { keyword: `%${keyword}%` })
          .orWhere('tpl.name LIKE :keyword', { keyword: `%${keyword}%` })
          .orWhere('tpl.description LIKE :keyword', { keyword: `%${keyword}%` })
      }))
    }

    qb.orderBy('tpl.category', 'ASC').addOrderBy('tpl.name', 'ASC')
    return paginate(qb, { page, pageSize })
  }

  async activeTemplates(context?: Pick<IAuthUser, 'tenantId'>) {
    const { tenantId } = requireTenantContext(context)
    return this.templateRepository.find({
      where: { isActive: 1, tenantId },
      order: { category: 'ASC', name: 'ASC' },
    })
  }

  async createTemplate(dto: CreateConsentTemplateDto, context?: Pick<IAuthUser, 'tenantId'>) {
    const { tenantId } = requireTenantContext(context)
    const existing = await this.templateRepository.findOneBy({ code: dto.code, tenantId })
    if (existing)
      throw new BusinessException('Consent template code already exists')

    const template = this.templateRepository.create({
      tenantId,
      ...dto,
      speciesScope: dto.speciesScope || null,
      riskLevel: dto.riskLevel || 'medium',
      variables: dto.variables || null,
      description: dto.description || null,
      isActive: dto.isActive ?? 1,
    })
    return this.templateRepository.save(template)
  }

  async updateTemplate(id: number, dto: UpdateConsentTemplateDto, context?: Pick<IAuthUser, 'tenantId'>) {
    const { tenantId } = requireTenantContext(context)
    const current = await this.templateRepository.findOneBy({ id, tenantId })
    if (!current)
      throw new BusinessException('Consent template not found')
    if (dto.code && dto.code !== current.code) {
      const existing = await this.templateRepository.findOneBy({ code: dto.code, tenantId })
      if (existing)
        throw new BusinessException('Consent template code already exists')
    }

    const payload: Partial<ConsentTemplateEntity> = {}
    if (dto.code !== undefined)
      payload.code = dto.code
    if (dto.name !== undefined)
      payload.name = dto.name
    if (dto.category !== undefined)
      payload.category = dto.category
    if (dto.speciesScope !== undefined)
      payload.speciesScope = dto.speciesScope || null
    if (dto.riskLevel !== undefined)
      payload.riskLevel = dto.riskLevel || 'medium'
    if (dto.content !== undefined)
      payload.content = dto.content
    if (dto.variables !== undefined)
      payload.variables = dto.variables || null
    if (dto.description !== undefined)
      payload.description = dto.description || null
    if (dto.isActive !== undefined)
      payload.isActive = dto.isActive

    if (Object.keys(payload).length)
      await this.templateRepository.update({ id, tenantId }, payload)
    return this.templateRepository.findOneBy({ id, tenantId })
  }

  async disableTemplate(id: number, context?: Pick<IAuthUser, 'tenantId'>) {
    const { tenantId } = requireTenantContext(context)
    const current = await this.templateRepository.findOneBy({ id, tenantId })
    if (!current)
      throw new BusinessException('Consent template not found')
    await this.templateRepository.update({ id, tenantId }, { isActive: 0 })
  }

  async listRecords(dto: QueryConsentRecordDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { page = 1, pageSize = 10, visitId, customerId, petId, category, status, keyword } = dto
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const qb = this.recordRepository.createQueryBuilder('record')
      .leftJoinAndSelect('record.customer', 'customer')
      .leftJoinAndSelect('record.pet', 'pet')
      .leftJoinAndSelect('record.doctor', 'doctor')
      .leftJoinAndSelect('record.visit', 'visit')
      .leftJoinAndSelect('record.template', 'template')
      .where('record.tenantId = :tenantId', { tenantId })
      .andWhere('record.areaId = :areaId', { areaId })

    if (visitId)
      qb.andWhere('record.visitId = :visitId', { visitId })
    if (customerId)
      qb.andWhere('record.customerId = :customerId', { customerId })
    if (petId)
      qb.andWhere('record.petId = :petId', { petId })
    if (category)
      qb.andWhere('record.category = :category', { category })
    if (status !== undefined)
      qb.andWhere('record.status = :status', { status })
    if (keyword) {
      qb.andWhere(new Brackets((subQb) => {
        subQb
          .where('record.recordNo LIKE :keyword', { keyword: `%${keyword}%` })
          .orWhere('record.title LIKE :keyword', { keyword: `%${keyword}%` })
          .orWhere('customer.name LIKE :keyword', { keyword: `%${keyword}%` })
          .orWhere('pet.name LIKE :keyword', { keyword: `%${keyword}%` })
      }))
    }

    qb.orderBy('record.createdAt', 'DESC')
    return paginate(qb, { page, pageSize })
  }

  async getRecord(id: number, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    return this.recordRepository.findOne({
      where: { id, tenantId, areaId },
      relations: ['customer', 'pet', 'doctor', 'visit', 'template'],
    })
  }

  async createRecord(dto: CreateConsentRecordDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const template = await this.templateRepository.findOneBy({ id: dto.templateId, tenantId })
    if (!template || template.isActive !== 1)
      throw new BusinessException('Consent template not found or inactive')

    const visit = dto.visitId
      ? await this.visitRepository.findOne({ where: { id: dto.visitId, tenantId, areaId }, relations: ['customer', 'pet', 'doctor'] })
      : null

    const customerId = dto.customerId ?? visit?.customerId
    const petId = dto.petId ?? visit?.petId
    const doctorId = dto.doctorId ?? visit?.doctorId ?? null
    if (!customerId || !petId)
      throw new BusinessException('Customer and pet are required')

    const [customer, pet, doctor] = await Promise.all([
      this.customerRepository.findOneBy({ id: customerId, tenantId }),
      this.petRepository.findOneBy({ id: petId, tenantId }),
      doctorId ? this.doctorRepository.findOneBy({ id: doctorId, tenantId }) : Promise.resolve(null),
    ])

    if (!customer)
      throw new BusinessException('Customer not found')
    if (!pet)
      throw new BusinessException('Pet not found')
    if (Number(pet.customerId) !== Number(customer.id))
      throw new BusinessException('Pet does not belong to the selected customer')
    if (visit && Number(visit.petId) !== Number(pet.id))
      throw new BusinessException('Visit does not belong to the selected pet')

    const record = this.recordRepository.create({
      tenantId,
      areaId,
      recordNo: await this.generateRecordNo({ tenantId, areaId }),
      templateId: template.id,
      visitId: visit?.id ?? null,
      customerId: customer.id,
      petId: pet.id,
      doctorId: doctor?.id ?? null,
      title: template.name,
      category: template.category,
      riskLevel: template.riskLevel,
      contentSnapshot: this.renderContent(template.content, { customer, pet, doctor, visit }),
      templateSnapshot: {
        id: template.id,
        code: template.code,
        name: template.name,
        category: template.category,
        riskLevel: template.riskLevel,
        variables: template.variables,
      },
      customerSnapshot: { id: customer.id, name: customer.name, phone: customer.phone, idCard: customer.idCard },
      petSnapshot: { id: pet.id, name: pet.name, species: pet.species, breed: pet.breed, gender: pet.gender, weight: pet.weight },
      doctorSnapshot: doctor ? { id: doctor.id, name: doctor.name, title: doctor.title, position: doctor.position } : null,
      status: 1,
      guardianName: dto.guardianName || customer.name,
      guardianPhone: dto.guardianPhone || customer.phone,
      remark: dto.remark || null,
    })
    return this.recordRepository.save(record)
  }

  async signRecord(id: number, dto: SignConsentRecordDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const record = await this.recordRepository.findOneBy({ id, tenantId, areaId })
    if (!record)
      throw new BusinessException('Consent record not found')
    if (record.status === 3)
      throw new BusinessException('Consent record has been voided')
    if (record.status === 2)
      throw new BusinessException('Consent record has already been signed')

    await this.recordRepository.update({ id, tenantId, areaId }, {
      status: 2,
      guardianName: dto.guardianName,
      guardianPhone: dto.guardianPhone || record.guardianPhone,
      signatureData: dto.signatureData || record.signatureData,
      signedAt: dto.signedAt || new Date().toISOString(),
    })
    return this.getRecord(id, { tenantId, areaId })
  }

  async voidRecord(id: number, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const record = await this.recordRepository.findOneBy({ id, tenantId, areaId })
    if (!record)
      throw new BusinessException('Consent record not found')
    if (record.status === 2)
      throw new BusinessException('Signed consent record cannot be voided')
    if (record.status === 3)
      return
    await this.recordRepository.update({ id, tenantId, areaId }, { status: 3 })
  }

  private renderContent(content: string, data: { customer: CustomerEntity, pet: PetEntity, doctor: DoctorEntity | null, visit: VisitEntity | null }) {
    const today = new Date()
    const todayIso = today.toISOString().slice(0, 10)
    const todayCn = `${today.getFullYear()}年${String(today.getMonth() + 1).padStart(2, '0')}月${String(today.getDate()).padStart(2, '0')}日`
    const variables: Record<string, any> = {
      'customerName': data.customer.name,
      'customerPhone': data.customer.phone,
      'petName': data.pet.name,
      'petSpecies': data.pet.species,
      'petBreed': data.pet.breed,
      'petWeight': data.pet.weight ?? '',
      'doctorName': data.doctor?.name ?? '',
      'visitNo': data.visit?.visitNo ?? '',
      'date': todayIso,
      'today.iso': todayIso,
      'today.cn': todayCn,
      'customer.name': data.customer.name,
      'customer.phone': data.customer.phone,
      'customer.idCard': data.customer.idCard ?? '',
      'pet.name': data.pet.name,
      'pet.species': data.pet.species,
      'pet.breed': data.pet.breed,
      'pet.weight': data.pet.weight ?? '',
      'doctor.name': data.doctor?.name ?? '',
      'doctor.title': data.doctor?.title ?? '',
      'visit.visitNo': data.visit?.visitNo ?? '',
    }
    return content
      .replace(/\[\[\s*([\w.]+)\s*\]\]/g, (_, key) => String(variables[key] ?? ''))
      .replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => String(variables[key] ?? ''))
  }

  private async generateRecordNo(context: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const now = new Date()
    const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
    const prefix = `IC${date}`
    const latest = await this.recordRepository
      .createQueryBuilder('record')
      .select(['record.recordNo'])
      .where('record.recordNo LIKE :prefix', { prefix: `${prefix}%` })
      .andWhere('record.tenantId = :tenantId', { tenantId })
      .andWhere('record.areaId = :areaId', { areaId })
      .orderBy('record.recordNo', 'DESC')
      .getOne()
    const currentSeq = latest?.recordNo ? Number(latest.recordNo.slice(prefix.length)) || 0 : 0
    return `${prefix}${String(currentSeq + 1).padStart(4, '0')}`
  }
}
