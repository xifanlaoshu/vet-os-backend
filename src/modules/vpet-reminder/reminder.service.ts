import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Brackets, Repository } from 'typeorm'
import { BusinessException } from '~/common/exceptions/biz.exception'
import { paginate } from '~/helper/paginate'
import { CustomerEntity } from '../vpet-customer/entities/customer.entity'
import { PetEntity } from '../vpet-pet/entities/pet.entity'
import { VisitEntity } from '../vpet-visit/entities/visit.entity'
import { CreateReminderDto, QueryReminderDto, UpdateReminderDto } from './dto/reminder.dto'
import { ReminderEntity } from './entities/reminder.entity'

@Injectable()
export class ReminderService {
  constructor(
    @InjectRepository(ReminderEntity)
    private reminderRepository: Repository<ReminderEntity>,
    @InjectRepository(CustomerEntity)
    private customerRepository: Repository<CustomerEntity>,
    @InjectRepository(PetEntity)
    private petRepository: Repository<PetEntity>,
    @InjectRepository(VisitEntity)
    private visitRepository: Repository<VisitEntity>,
  ) {}

  async list(dto: QueryReminderDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { page = 1, pageSize = 10, customerId, petId, status, type, keyword } = dto
    const tenantId = context?.tenantId ?? 1
    const areaId = context?.areaId ?? 1
    const qb = this.reminderRepository.createQueryBuilder('r')
      .leftJoinAndSelect('r.customer', 'customer')
      .leftJoinAndSelect('r.pet', 'pet')
      .where('r.tenantId = :tenantId', { tenantId })
      .andWhere('r.areaId = :areaId', { areaId })

    if (customerId)
      qb.andWhere('r.customerId = :customerId', { customerId })
    if (petId)
      qb.andWhere('r.petId = :petId', { petId })
    if (status !== undefined)
      qb.andWhere('r.status = :status', { status })
    if (type !== undefined)
      qb.andWhere('r.type = :type', { type })
    if (keyword) {
      qb.andWhere(new Brackets((subQb) => {
        subQb
          .where('r.reminderName LIKE :keyword', { keyword: `%${keyword}%` })
          .orWhere('customer.name LIKE :keyword', { keyword: `%${keyword}%` })
          .orWhere('pet.name LIKE :keyword', { keyword: `%${keyword}%` })
      }))
    }

    qb.orderBy('r.dueDate', 'ASC')
    return paginate(qb, { page, pageSize })
  }

  async create(dto: CreateReminderDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const tenantId = context?.tenantId ?? 1
    const areaId = context?.areaId ?? 1
    const [customer, pet, visit] = await Promise.all([
      this.customerRepository.findOneBy({ id: dto.customerId, tenantId }),
      this.petRepository.findOneBy({ id: dto.petId, tenantId }),
      dto.visitId ? this.visitRepository.findOneBy({ id: dto.visitId, tenantId, areaId }) : Promise.resolve(null),
    ])
    if (!customer)
      throw new BusinessException('Customer not found')
    if (!pet)
      throw new BusinessException('Pet not found')
    if (Number(pet.customerId) !== Number(customer.id))
      throw new BusinessException('Pet does not belong to the selected customer')
    if (visit && Number(visit.petId) !== Number(dto.petId))
      throw new BusinessException('Visit does not belong to the selected pet')

    const reminder = this.reminderRepository.create({
      tenantId,
      areaId,
      ...dto,
      status: 1,
      customerSnapshot: { id: customer.id, name: customer.name, phone: customer.phone },
      petSnapshot: { id: pet.id, name: pet.name, species: pet.species, breed: pet.breed },
    })
    return this.reminderRepository.save(reminder)
  }

  async update(id: number, dto: UpdateReminderDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const tenantId = context?.tenantId ?? 1
    const areaId = context?.areaId ?? 1
    const current = await this.reminderRepository.findOneBy({ id, tenantId, areaId })
    if (!current)
      throw new BusinessException('Reminder not found')
    await this.reminderRepository.update({ id, tenantId, areaId }, dto)
    return this.reminderRepository.findOneBy({ id, tenantId, areaId })
  }

  async complete(id: number, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const tenantId = context?.tenantId ?? 1
    const areaId = context?.areaId ?? 1
    const current = await this.reminderRepository.findOneBy({ id, tenantId, areaId })
    if (!current)
      throw new BusinessException('Reminder not found')
    await this.reminderRepository.update({ id, tenantId, areaId }, {
      status: 3,
      completedAt: new Date().toISOString(),
      lastRemindedAt: new Date().toISOString(),
    })
    return this.reminderRepository.findOneBy({ id, tenantId, areaId })
  }

  async cancel(id: number, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const tenantId = context?.tenantId ?? 1
    const areaId = context?.areaId ?? 1
    const current = await this.reminderRepository.findOneBy({ id, tenantId, areaId })
    if (!current)
      throw new BusinessException('Reminder not found')
    await this.reminderRepository.update({ id, tenantId, areaId }, { status: 4 })
    return this.reminderRepository.findOneBy({ id, tenantId, areaId })
  }
}
