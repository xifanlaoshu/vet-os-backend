import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Brackets, Repository } from 'typeorm'
import { BusinessException } from '~/common/exceptions/biz.exception'
import { requireTenantAreaContext } from '~/common/utils/tenant-context.util'
import { paginate } from '~/helper/paginate'
import { DoctorEntity } from '../vpet-appointment/entities/doctor.entity'
import { CustomerEntity } from '../vpet-customer/entities/customer.entity'
import { PetEntity } from '../vpet-pet/entities/pet.entity'
import { VisitEntity } from '../vpet-visit/entities/visit.entity'
import {
  CreateHospitalizationDto,
  CreateNursingPlanDto,
  DischargeHospitalizationDto,
  ExecuteNursingPlanDto,
  QueryHospitalizationDto,
} from './dto/hospitalization.dto'
import { HospitalizationEntity } from './entities/hospitalization.entity'
import { NursingExecutionEntity } from './entities/nursing-execution.entity'
import { NursingPlanEntity } from './entities/nursing-plan.entity'

@Injectable()
export class HospitalizationService {
  constructor(
    @InjectRepository(HospitalizationEntity)
    private hospitalizationRepository: Repository<HospitalizationEntity>,
    @InjectRepository(NursingPlanEntity)
    private nursingPlanRepository: Repository<NursingPlanEntity>,
    @InjectRepository(NursingExecutionEntity)
    private nursingExecutionRepository: Repository<NursingExecutionEntity>,
    @InjectRepository(VisitEntity)
    private visitRepository: Repository<VisitEntity>,
    @InjectRepository(CustomerEntity)
    private customerRepository: Repository<CustomerEntity>,
    @InjectRepository(PetEntity)
    private petRepository: Repository<PetEntity>,
    @InjectRepository(DoctorEntity)
    private doctorRepository: Repository<DoctorEntity>,
  ) {}

  async list(dto: QueryHospitalizationDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { page = 1, pageSize = 10, status, doctorId, keyword } = dto
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const qb = this.hospitalizationRepository.createQueryBuilder('h')
      .leftJoinAndSelect('h.pet', 'pet')
      .leftJoinAndSelect('h.customer', 'customer')
      .leftJoinAndSelect('h.doctor', 'doctor')
      .where('h.tenantId = :tenantId', { tenantId })
      .andWhere('h.areaId = :areaId', { areaId })

    if (status !== undefined)
      qb.andWhere('h.status = :status', { status })
    if (doctorId)
      qb.andWhere('h.doctorId = :doctorId', { doctorId })
    if (keyword) {
      qb.andWhere(new Brackets((subQb) => {
        subQb
          .where('h.hospNo LIKE :keyword', { keyword: `%${keyword}%` })
          .orWhere('pet.name LIKE :keyword', { keyword: `%${keyword}%` })
          .orWhere('customer.name LIKE :keyword', { keyword: `%${keyword}%` })
          .orWhere('h.cageCode LIKE :keyword', { keyword: `%${keyword}%` })
      }))
    }

    qb.orderBy('h.admissionAt', 'DESC')
    return paginate(qb, { page, pageSize })
  }

  async create(dto: CreateHospitalizationDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const visit = await this.visitRepository.findOne({
      where: { id: dto.visitId, tenantId, areaId },
      relations: ['customer', 'pet'],
    })
    if (!visit)
      throw new BusinessException('Visit not found')

    const existing = await this.hospitalizationRepository.findOneBy({ visitId: dto.visitId, tenantId, areaId })
    if (existing)
      throw new BusinessException('Visit already has hospitalization record')

    const [customer, pet, doctor] = await Promise.all([
      this.customerRepository.findOneBy({ id: dto.customerId ?? visit.customerId, tenantId }),
      this.petRepository.findOneBy({ id: dto.petId ?? visit.petId, tenantId }),
      (dto.doctorId ?? visit.doctorId) ? this.doctorRepository.findOneBy({ id: dto.doctorId ?? visit.doctorId, tenantId }) : Promise.resolve(null),
    ])
    if (!customer)
      throw new BusinessException('Customer not found')
    if (!pet)
      throw new BusinessException('Pet not found')
    if (visit.customerId && Number(customer.id) !== Number(visit.customerId))
      throw new BusinessException('Hospitalization customer does not match visit customer')
    if (visit.petId && Number(pet.id) !== Number(visit.petId))
      throw new BusinessException('Hospitalization pet does not match visit pet')
    if (doctor && visit.doctorId && Number(doctor.id) !== Number(visit.doctorId))
      throw new BusinessException('Hospitalization doctor does not match visit doctor')
    if (Number(pet.customerId) !== Number(customer.id))
      throw new BusinessException('Pet does not belong to the selected customer')

    const record = this.hospitalizationRepository.create({
      tenantId,
      areaId,
      hospNo: await this.generateHospNo({ tenantId, areaId }),
      visitId: dto.visitId,
      customerId: customer.id,
      petId: pet.id,
      doctorId: dto.doctorId ?? visit.doctorId ?? null,
      cageCode: dto.cageCode,
      admissionAt: dto.admissionAt ?? new Date().toISOString(),
      dailyFee: dto.dailyFee ?? 0,
      depositAmount: dto.depositAmount ?? 0,
      nursingLevel: dto.nursingLevel ?? 1,
      weightAtAdmission: dto.weightAtAdmission ?? pet.weight ?? null,
      admissionDiagnosis: dto.admissionDiagnosis,
      remark: dto.remark,
      status: 1,
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
      doctorSnapshot: doctor
        ? { id: doctor.id, name: doctor.name, department: doctor.department }
        : null,
    })

    const saved = await this.hospitalizationRepository.save(record)
    await this.petRepository.update({ id: pet.id, tenantId }, { status: 2 })
    return this.getDetail(saved.id, { tenantId, areaId })
  }

  async getDetail(id: number, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    return this.hospitalizationRepository.findOne({
      where: { id, tenantId, areaId },
      relations: ['pet', 'customer', 'doctor', 'nursingPlans', 'nursingPlans.executions'],
    })
  }

  async createPlan(hospId: number, dto: CreateNursingPlanDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const hosp = await this.hospitalizationRepository.findOneBy({ id: hospId, tenantId, areaId })
    if (!hosp)
      throw new BusinessException('Hospitalization record not found')

    const plan = this.nursingPlanRepository.create({
      tenantId,
      areaId,
      hospId,
      planType: dto.planType,
      planName: dto.planName,
      instruction: dto.instruction,
      frequency: dto.frequency,
      scheduledTime: dto.scheduledTime,
      doctorId: dto.doctorId ?? hosp.doctorId ?? null,
      status: 1,
      latestExecutionStatus: 1,
    })

    await this.nursingPlanRepository.save(plan)
    return this.listPlans(hospId, { tenantId, areaId })
  }

  async listPlans(hospId: number, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    return this.nursingPlanRepository.find({
      where: { hospId, tenantId, areaId },
      relations: ['doctor', 'executions'],
      order: { scheduledTime: 'ASC', id: 'ASC' },
    })
  }

  async executePlan(planId: number, dto: ExecuteNursingPlanDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const plan = await this.nursingPlanRepository.findOneBy({ id: planId, tenantId, areaId })
    if (!plan)
      throw new BusinessException('Nursing plan not found')

    const execution = this.nursingExecutionRepository.create({
      tenantId,
      areaId,
      hospId: plan.hospId,
      planId,
      executorId: dto.executorId ?? null,
      executorName: dto.executorName ?? null,
      status: dto.status ?? 2,
      executedAt: dto.executedAt ?? new Date().toISOString(),
      resultNote: dto.resultNote,
      vitalSigns: dto.vitalSigns,
    })
    await this.nursingExecutionRepository.save(execution)

    await this.nursingPlanRepository.update({ id: planId, tenantId, areaId }, {
      latestExecutionStatus: execution.status,
      latestExecutionAt: execution.executedAt,
    })

    return this.nursingExecutionRepository.find({
      where: { planId, tenantId, areaId },
      order: { executedAt: 'DESC' },
    })
  }

  async discharge(id: number, dto: DischargeHospitalizationDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const hosp = await this.hospitalizationRepository.findOneBy({ id, tenantId, areaId })
    if (!hosp)
      throw new BusinessException('Hospitalization record not found')

    await this.hospitalizationRepository.update({ id, tenantId, areaId }, {
      status: 2,
      dischargeAt: dto.dischargeAt ?? new Date().toISOString(),
      dischargeSummary: dto.dischargeSummary,
    })
    await this.petRepository.update({ id: hosp.petId, tenantId }, { status: 1 })
    return this.getDetail(id, { tenantId, areaId })
  }

  private async generateHospNo(context: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const date = this.getTodaySequenceDate()
    const prefix = `HOSP${date}`
    const latestHosp = await this.hospitalizationRepository
      .createQueryBuilder('h')
      .select(['h.hospNo'])
      .where('h.hospNo LIKE :prefix', { prefix: `${prefix}%` })
      .andWhere('h.tenantId = :tenantId', { tenantId })
      .andWhere('h.areaId = :areaId', { areaId })
      .orderBy('h.hospNo', 'DESC')
      .getOne()

    const currentSeq = latestHosp?.hospNo
      ? Number(latestHosp.hospNo.slice(prefix.length)) || 0
      : 0
    return `${prefix}${String(currentSeq + 1).padStart(4, '0')}`
  }

  private getTodaySequenceDate() {
    const now = new Date()
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  }
}
