import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Brackets, Repository } from 'typeorm'
import { BusinessException } from '~/common/exceptions/biz.exception'
import { requireTenantAreaContext } from '~/common/utils/tenant-context.util'
import { paginate } from '~/helper/paginate'
import { BillingEntity } from '../vpet-billing/entities/billing.entity'
import { CustomerEntity } from '../vpet-customer/entities/customer.entity'
import { PetEntity } from '../vpet-pet/entities/pet.entity'
import { VisitEntity } from '../vpet-visit/entities/visit.entity'
import { CreateInsuranceClaimDto, QueryInsuranceClaimDto, SettleInsuranceClaimDto } from './dto/insurance.dto'
import { InsuranceClaimEntity } from './entities/insurance-claim.entity'

let claimSeq = 0

function generateClaimNo() {
  claimSeq += 1
  return `CLM${String(Date.now()).slice(-8)}${String(claimSeq).padStart(4, '0')}`
}

@Injectable()
export class InsuranceService {
  constructor(
    @InjectRepository(InsuranceClaimEntity)
    private claimRepository: Repository<InsuranceClaimEntity>,
    @InjectRepository(VisitEntity)
    private visitRepository: Repository<VisitEntity>,
    @InjectRepository(BillingEntity)
    private billingRepository: Repository<BillingEntity>,
    @InjectRepository(CustomerEntity)
    private customerRepository: Repository<CustomerEntity>,
    @InjectRepository(PetEntity)
    private petRepository: Repository<PetEntity>,
  ) {}

  async list(dto: QueryInsuranceClaimDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { page = 1, pageSize = 10, status, keyword } = dto
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const qb = this.claimRepository.createQueryBuilder('claim')
      .leftJoinAndSelect('claim.customer', 'customer')
      .leftJoinAndSelect('claim.pet', 'pet')
      .where('claim.tenantId = :tenantId', { tenantId })
      .andWhere('claim.areaId = :areaId', { areaId })

    if (status !== undefined)
      qb.andWhere('claim.status = :status', { status })
    if (keyword) {
      qb.andWhere(new Brackets((subQb) => {
        subQb
          .where('claim.claimNo LIKE :keyword', { keyword: `%${keyword}%` })
          .orWhere('claim.providerName LIKE :keyword', { keyword: `%${keyword}%` })
          .orWhere('customer.name LIKE :keyword', { keyword: `%${keyword}%` })
          .orWhere('pet.name LIKE :keyword', { keyword: `%${keyword}%` })
      }))
    }

    qb.orderBy('claim.createdAt', 'DESC')
    return paginate(qb, { page, pageSize })
  }

  async create(dto: CreateInsuranceClaimDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const [visit, billing, customer, pet] = await Promise.all([
      this.visitRepository.findOneBy({ id: dto.visitId, tenantId, areaId }),
      dto.billingId ? this.billingRepository.findOneBy({ id: dto.billingId, tenantId, areaId }) : Promise.resolve(null),
      this.customerRepository.findOneBy({ id: dto.customerId, tenantId }),
      this.petRepository.findOneBy({ id: dto.petId, tenantId }),
    ])
    if (!visit)
      throw new BusinessException('Visit not found')
    if (!customer)
      throw new BusinessException('Customer not found')
    if (!pet)
      throw new BusinessException('Pet not found')
    if (Number(visit.customerId) !== Number(dto.customerId) || Number(visit.petId) !== Number(dto.petId)) {
      throw new BusinessException('Insurance claim data does not match visit')
    }
    if (billing && Number(billing.visitId) !== Number(dto.visitId)) {
      throw new BusinessException('Billing does not match visit')
    }

    return this.claimRepository.save(this.claimRepository.create({
      tenantId,
      areaId,
      claimNo: generateClaimNo(),
      ...dto,
      status: 1,
      customerSnapshot: { id: customer.id, name: customer.name, phone: customer.phone },
      petSnapshot: { id: pet.id, name: pet.name, species: pet.species, breed: pet.breed },
    }))
  }

  async submit(id: number, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const claim = await this.claimRepository.findOneBy({ id, tenantId, areaId })
    if (!claim)
      throw new BusinessException('Insurance claim not found')
    if (Number(claim.status) !== 1)
      throw new BusinessException('Only draft insurance claims can be submitted')
    await this.claimRepository.update({ id, tenantId, areaId }, {
      status: 2,
      submittedAt: claim.submittedAt ?? new Date().toISOString(),
    })
    return this.claimRepository.findOneBy({ id, tenantId, areaId })
  }

  async settle(id: number, dto: SettleInsuranceClaimDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const claim = await this.claimRepository.findOneBy({ id, tenantId, areaId })
    if (!claim)
      throw new BusinessException('Insurance claim not found')
    if (Number(claim.status) !== 2)
      throw new BusinessException('Only submitted insurance claims can be settled')
    if (Number(dto.approvedAmount) > Number(claim.claimAmount))
      throw new BusinessException('Approved amount cannot exceed claim amount')
    await this.claimRepository.update({ id, tenantId, areaId }, {
      status: 3,
      approvedAmount: dto.approvedAmount,
      settledAt: new Date().toISOString(),
      remark: dto.remark,
    })
    return this.claimRepository.findOneBy({ id, tenantId, areaId })
  }
}
