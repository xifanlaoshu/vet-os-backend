import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { BaseService } from '~/helper/crud/base.service'
import { paginate } from '~/helper/paginate'
import { QueryPetDto } from './dto/pet.dto'
import { PetEntity } from './entities/pet.entity'
import { BreedEntity, SpeciesEntity } from './entities/species.entity'
import { WeightRecordEntity } from './entities/weight-record.entity'

@Injectable()
export class PetService extends BaseService<PetEntity> {
  constructor(
    @InjectRepository(PetEntity)
    private petRepository: Repository<PetEntity>,
    @InjectRepository(WeightRecordEntity)
    private weightRepository: Repository<WeightRecordEntity>,
    @InjectRepository(SpeciesEntity)
    private speciesRepository: Repository<SpeciesEntity>,
    @InjectRepository(BreedEntity)
    private breedRepository: Repository<BreedEntity>,
  ) {
    super(petRepository)
  }

  async list(dto: QueryPetDto) {
    const { page = 1, pageSize = 10, keyword, customerId, species } = dto
    const qb = this.petRepository.createQueryBuilder('p')

    if (keyword) {
      qb.where('p.name LIKE :kw OR p.breed LIKE :kw', { kw: `%${keyword}%` })
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

  async getSpeciesOptions() {
    return this.speciesRepository.find({ order: { code: 'ASC' } })
  }

  async getBreedOptions(speciesCode: string) {
    return this.breedRepository.find({
      where: { speciesCode },
      order: { name: 'ASC' },
    })
  }

  async getHealthTimeline(petId: number) {
    const pet = await this.petRepository.findOne({
      where: { id: petId },
      relations: ['customer'],
    })
    if (!pet)
      return null

    const weights = await this.weightRepository.find({
      where: { petId },
      order: { recordedAt: 'DESC' },
      take: 20,
    })

    return { pet, weights }
  }

  async recordWeight(petId: number, weight: number, bcs?: number, source = 1) {
    const record = this.weightRepository.create({
      petId,
      weight,
      bcs: bcs ?? null,
      recordedAt: new Date().toISOString(),
      source,
    })
    await this.weightRepository.save(record)
    await this.petRepository.update(petId, { weight })
    return record
  }
}
