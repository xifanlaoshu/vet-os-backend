import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { BaseService } from '~/helper/crud/base.service'
import { paginate } from '~/helper/paginate'
import { QueryCustomerDto } from './dto/customer.dto'
import { CustomerEntity } from './entities/customer.entity'

@Injectable()
export class CustomerService extends BaseService<CustomerEntity> {
  constructor(
    @InjectRepository(CustomerEntity)
    private customerRepository: Repository<CustomerEntity>,
  ) {
    super(customerRepository)
  }

  async list(dto: QueryCustomerDto) {
    const { page = 1, pageSize = 10, keyword, name, phone } = dto
    const queryBuilder = this.customerRepository.createQueryBuilder('c')

    if (keyword) {
      queryBuilder.where(
        'c.name LIKE :kw OR c.phone LIKE :kw',
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

  async findByPhone(phone: string): Promise<CustomerEntity | null> {
    return this.customerRepository.findOneBy({ phone })
  }

  async findOrCreate(phone: string, name: string): Promise<CustomerEntity> {
    let customer = await this.findByPhone(phone)
    if (!customer) {
      customer = await this.create({ name, phone })
    }
    return customer
  }
}
