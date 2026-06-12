import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { BusinessException } from '~/common/exceptions/biz.exception'
import { BaseService } from '~/helper/crud/base.service'
import { paginate } from '~/helper/paginate'
import { CustomerEntity } from '../vpet-customer/entities/customer.entity'
import { CreatePetDto, QueryPetDto, UpdatePetDto } from './dto/pet.dto'
import { PetEntity } from './entities/pet.entity'
import { BreedEntity, SpeciesEntity } from './entities/species.entity'
import { WeightRecordEntity } from './entities/weight-record.entity'

@Injectable()
export class PetService extends BaseService<PetEntity> {
  constructor(
    @InjectRepository(PetEntity)
    private petRepository: Repository<PetEntity>,
    @InjectRepository(CustomerEntity)
    private customerRepository: Repository<CustomerEntity>,
    @InjectRepository(WeightRecordEntity)
    private weightRepository: Repository<WeightRecordEntity>,
    @InjectRepository(SpeciesEntity)
    private speciesRepository: Repository<SpeciesEntity>,
    @InjectRepository(BreedEntity)
    private breedRepository: Repository<BreedEntity>,
  ) {
    super(petRepository)
  }

  async list(dto: QueryPetDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { page = 1, pageSize = 10, keyword, customerId, species } = dto
    const tenantId = context?.tenantId ?? 1
    const qb = this.petRepository.createQueryBuilder('p')
      .leftJoinAndSelect('p.customer', 'customer')
      .where('p.tenantId = :tenantId', { tenantId })

    if (keyword) {
      qb.andWhere('(p.name LIKE :kw OR p.breed LIKE :kw OR customer.name LIKE :kw)', { kw: `%${keyword}%` })
    }
    else {
      if (customerId)
        qb.andWhere('p.customerId = :cid', { customerId, cid: customerId })
      if (species)
        qb.andWhere('p.species = :species', { species })
    }

    qb.orderBy('p.createdAt', 'DESC')
    return paginate(qb, { page, pageSize })
  }

  async getSpeciesOptions(context?: Pick<IAuthUser, 'tenantId'>) {
    return this.speciesRepository.find({
      where: { tenantId: context?.tenantId ?? 1 },
      order: { code: 'ASC' },
    })
  }

  async getBreedOptions(speciesCode: string, context?: Pick<IAuthUser, 'tenantId'>) {
    return this.breedRepository.find({
      where: { speciesCode, tenantId: context?.tenantId ?? 1 },
      order: { name: 'ASC' },
    })
  }

  async getById(id: number, context?: Pick<IAuthUser, 'tenantId'>) {
    return this.petRepository.findOne({
      where: { id, tenantId: context?.tenantId ?? 1 },
      relations: ['customer'],
    })
  }

  async createPet(dto: CreatePetDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const tenantId = context?.tenantId ?? 1
    const customer = await this.customerRepository.findOneBy({ id: dto.customerId, tenantId })
    if (!customer)
      throw new BusinessException('Customer not found')
    return this.petRepository.save(this.petRepository.create({
      ...dto,
      tenantId,
      homeAreaId: context?.areaId ?? customer.homeAreaId ?? null,
    }))
  }

  async updatePet(id: number, dto: UpdatePetDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const tenantId = context?.tenantId ?? 1
    const current = await this.petRepository.findOneBy({ id, tenantId })
    if (!current)
      throw new BusinessException('Pet not found')
    if (dto.customerId !== undefined) {
      const customer = await this.customerRepository.findOneBy({ id: dto.customerId, tenantId })
      if (!customer)
        throw new BusinessException('Customer not found')
    }
    await this.petRepository.update({ id, tenantId }, dto)
  }

  async deletePet(id: number, context?: Pick<IAuthUser, 'tenantId'>) {
    const tenantId = context?.tenantId ?? 1
    const current = await this.petRepository.findOneBy({ id, tenantId })
    if (!current)
      throw new BusinessException('Pet not found')
    await this.petRepository.delete({ id, tenantId })
  }

  async getHealthTimeline(petId: number, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const pet = await this.petRepository.findOne({
      where: { id: petId, tenantId: context?.tenantId ?? 1 },
      relations: ['customer'],
    })
    if (!pet)
      return null

    const weights = await this.weightRepository.find({
      where: { petId, tenantId: context?.tenantId ?? 1 },
      order: { recordedAt: 'DESC' },
      take: 20,
    })

    return { pet, weights }
  }

  async recordWeight(petId: number, weight: number, bcs?: number, source = 1, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const tenantId = context?.tenantId ?? 1
    const pet = await this.petRepository.findOneBy({ id: petId, tenantId })
    if (!pet)
      throw new BusinessException('Pet not found')
    const record = this.weightRepository.create({
      tenantId,
      areaId: context?.areaId ?? 1,
      petId,
      weight,
      bcs: bcs ?? null,
      recordedAt: new Date().toISOString(),
      source,
    })
    await this.weightRepository.save(record)
    await this.petRepository.update({ id: petId, tenantId }, { weight })
    return record
  }
}
