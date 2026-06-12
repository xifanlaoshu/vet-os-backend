import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { BusinessException } from '~/common/exceptions/biz.exception'
import { requireTenantContext } from '~/common/utils/tenant-context.util'
import { BaseService } from '~/helper/crud/base.service'
import { paginate } from '~/helper/paginate'
import { CreateCustomerDto, QueryCustomerDto, UpdateCustomerDto } from './dto/customer.dto'
import { CustomerEntity } from './entities/customer.entity'

@Injectable()
export class CustomerService extends BaseService<CustomerEntity> {
  constructor(
    @InjectRepository(CustomerEntity)
    private customerRepository: Repository<CustomerEntity>,
  ) {
    super(customerRepository)
  }

  async list(dto: QueryCustomerDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { page = 1, pageSize = 10, keyword, name, phone } = dto
    const { tenantId } = requireTenantContext(context)
    const queryBuilder = this.customerRepository.createQueryBuilder('c')
      .where('c.tenantId = :tenantId', { tenantId })

    if (keyword) {
      queryBuilder.andWhere(
        '(c.name LIKE :kw OR c.phone LIKE :kw)',
        { kw: `%${keyword}%` },
      )
    }
    else {
      if (name)
        queryBuilder.andWhere('c.name LIKE :name', { name: `%${name}%` })
      if (phone)
        queryBuilder.andWhere('c.phone LIKE :phone', { phone: `%${phone}%` })
    }

    queryBuilder.orderBy('c.createdAt', 'DESC')
    return paginate(queryBuilder, { page, pageSize })
  }

  async getById(id: number, context?: Pick<IAuthUser, 'tenantId'>): Promise<CustomerEntity | null> {
    const { tenantId } = requireTenantContext(context)
    return this.customerRepository.findOneBy({ id, tenantId })
  }

  async createCustomer(dto: CreateCustomerDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>): Promise<CustomerEntity> {
    const { tenantId } = requireTenantContext(context)
    const existing = await this.findByPhone(dto.phone, { tenantId })
    if (existing)
      throw new BusinessException('Customer phone already exists in current tenant')
    return this.customerRepository.save(this.customerRepository.create({
      ...dto,
      tenantId,
      homeAreaId: context?.areaId ?? null,
    }))
  }

  async updateCustomer(id: number, dto: UpdateCustomerDto, context?: Pick<IAuthUser, 'tenantId'>): Promise<void> {
    const { tenantId } = requireTenantContext(context)
    const current = await this.customerRepository.findOneBy({ id, tenantId })
    if (!current)
      throw new BusinessException('Customer not found')
    if (dto.phone && dto.phone !== current.phone) {
      const existing = await this.findByPhone(dto.phone, { tenantId })
      if (existing)
        throw new BusinessException('Customer phone already exists in current tenant')
    }
    await this.customerRepository.update({ id, tenantId }, dto)
  }

  async deleteCustomer(id: number, context?: Pick<IAuthUser, 'tenantId'>): Promise<void> {
    const { tenantId } = requireTenantContext(context)
    const current = await this.customerRepository.findOneBy({ id, tenantId })
    if (!current)
      throw new BusinessException('Customer not found')
    await this.customerRepository.delete({ id, tenantId })
  }

  async findByPhone(phone: string, context?: Pick<IAuthUser, 'tenantId'>): Promise<CustomerEntity | null> {
    const { tenantId } = requireTenantContext(context)
    return this.customerRepository.findOneBy({ phone, tenantId })
  }

  async findOrCreate(phone: string, name: string, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>): Promise<CustomerEntity> {
    let customer = await this.findByPhone(phone, context)
    if (!customer) {
      customer = await this.createCustomer({ name, phone }, context)
    }
    return customer
  }
}
