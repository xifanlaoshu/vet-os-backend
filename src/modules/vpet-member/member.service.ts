import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { requireTenantAreaContext, requireTenantContext } from '~/common/utils/tenant-context.util'
import { paginate, paginateRawAndEntities } from '~/helper/paginate'
import { CustomerEntity } from '../vpet-customer/entities/customer.entity'
import {
  DeductDto,
  OpenCardDto,
  QueryMemberCardDto,
  QueryMemberCardLogDto,
  RechargeDto,
} from './dto/member.dto'
import { MemberCardLogEntity } from './entities/member-card-log.entity'
import { MemberCardEntity } from './entities/member-card.entity'

@Injectable()
export class MemberService {
  constructor(
    @InjectRepository(MemberCardEntity)
    private cardRepository: Repository<MemberCardEntity>,
    @InjectRepository(MemberCardLogEntity)
    private logRepository: Repository<MemberCardLogEntity>,
    @InjectRepository(CustomerEntity)
    private customerRepository: Repository<CustomerEntity>,
    private dataSource: DataSource,
  ) {}

  async openCard(dto: OpenCardDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>): Promise<MemberCardEntity> {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const customer = await this.customerRepository.findOneBy({ id: dto.customerId, tenantId })
    if (!customer)
      throw new BadRequestException('Customer not found')
    const existing = await this.cardRepository.findOneBy({ customerId: dto.customerId, tenantId })
    if (existing)
      throw new BadRequestException('Member card already exists for this customer')

    const initialBalance = dto.initialBalance ?? 0
    const giftAmount = dto.giftAmount ?? 0

    const card = this.cardRepository.create({
      tenantId,
      customerId: dto.customerId,
      cardNo: await this.generateCardNo({ tenantId }),
      level: dto.level ?? 1,
      balance: initialBalance,
      giftBalance: giftAmount,
      totalRecharge: initialBalance,
    })

    const saved = await this.cardRepository.save(card)

    if (initialBalance > 0) {
      await this.logRepository.save({
        tenantId,
        areaId,
        cardId: saved.id,
        type: 1,
        amount: initialBalance,
        direction: 1,
        balanceBefore: 0,
        balanceAfter: initialBalance,
        remark: 'card_open_recharge',
      })
    }

    return saved
  }

  async listCards(dto: QueryMemberCardDto, context?: Pick<IAuthUser, 'tenantId'>) {
    const { page = 1, pageSize = 10, keyword, customerId, status, level } = dto
    const { tenantId } = requireTenantContext(context)
    const queryBuilder = this.cardRepository
      .createQueryBuilder('card')
      .leftJoin(CustomerEntity, 'customer', 'customer.id = card.customerId AND customer.tenantId = card.tenantId')
      .where('card.tenantId = :tenantId', { tenantId })
      .addSelect([
        'customer.id',
        'customer.name',
        'customer.phone',
        'customer.gender',
        'customer.status',
      ])

    if (customerId)
      queryBuilder.andWhere('card.customerId = :customerId', { customerId })
    if (status !== undefined)
      queryBuilder.andWhere('card.status = :status', { status })
    if (level !== undefined)
      queryBuilder.andWhere('card.level = :level', { level })
    if (keyword) {
      queryBuilder.andWhere(
        '(card.cardNo LIKE :kw OR customer.name LIKE :kw OR customer.phone LIKE :kw)',
        { kw: `%${keyword}%` },
      )
    }

    queryBuilder.orderBy('card.createdAt', 'DESC')

    const [pagination, rawRows] = await paginateRawAndEntities(queryBuilder, { page, pageSize })
    const mappedItems = pagination.items.map((card, index) => {
      const raw = rawRows[index] as any
      return {
        ...card,
        customer: {
          id: raw?.customer_id,
          name: raw?.customer_name,
          phone: raw?.customer_phone,
          gender: raw?.customer_gender,
          status: raw?.customer_status,
        },
      }
    })

    return {
      ...pagination,
      items: mappedItems,
    }
  }

  async getCardByCustomer(customerId: number, context?: Pick<IAuthUser, 'tenantId'>): Promise<MemberCardEntity | null> {
    const { tenantId } = requireTenantContext(context)
    return this.cardRepository.findOneBy({ customerId, tenantId })
  }

  async getCardById(id: number, context?: Pick<IAuthUser, 'tenantId'>): Promise<MemberCardEntity | null> {
    const { tenantId } = requireTenantContext(context)
    return this.cardRepository.findOneBy({ id, tenantId })
  }

  async recharge(cardId: number, dto: RechargeDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>): Promise<MemberCardEntity> {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    if (Number(dto.amount) <= 0)
      throw new BadRequestException('Recharge amount must be greater than 0')

    return this.dataSource.transaction(async (manager) => {
      const cardRepository = manager.getRepository(MemberCardEntity)
      const logRepository = manager.getRepository(MemberCardLogEntity)
      const card = await cardRepository.createQueryBuilder('card')
        .setLock('pessimistic_write')
        .where('card.id = :cardId', { cardId })
        .andWhere('card.tenantId = :tenantId', { tenantId })
        .getOne()
      if (!card)
        throw new BadRequestException('Member card not found')
      if (Number(card.status) !== 1)
        throw new BadRequestException('Member card is not active')

      const balanceBefore = Number(card.balance)
      card.balance = balanceBefore + dto.amount
      card.totalRecharge = Number(card.totalRecharge) + dto.amount

      await cardRepository.save(card)
      await logRepository.save(logRepository.create({
        tenantId,
        areaId,
        cardId,
        type: 1,
        amount: dto.amount,
        direction: 1,
        balanceBefore,
        balanceAfter: card.balance,
        operatorId: dto.operatorId,
        remark: dto.remark ?? 'recharge',
      }))

      return card
    })
  }

  async deduct(cardId: number, dto: DeductDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>): Promise<MemberCardEntity> {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    if (Number(dto.amount) <= 0)
      throw new BadRequestException('Deduct amount must be greater than 0')

    return this.dataSource.transaction(async (manager) => {
      const cardRepository = manager.getRepository(MemberCardEntity)
      const logRepository = manager.getRepository(MemberCardLogEntity)
      const card = await cardRepository.createQueryBuilder('card')
        .setLock('pessimistic_write')
        .where('card.id = :cardId', { cardId })
        .andWhere('card.tenantId = :tenantId', { tenantId })
        .getOne()
      if (!card)
        throw new BadRequestException('Member card not found')
      if (Number(card.status) !== 1)
        throw new BadRequestException('Member card is not active')
      if (Number(card.balance) < dto.amount)
        throw new BadRequestException('Insufficient balance')

      const balanceBefore = Number(card.balance)
      card.balance = balanceBefore - dto.amount
      card.totalSpend = Number(card.totalSpend) + dto.amount

      await cardRepository.save(card)
      await logRepository.save(logRepository.create({
        tenantId,
        areaId,
        cardId,
        type: 3,
        amount: dto.amount,
        direction: 2,
        balanceBefore,
        balanceAfter: card.balance,
        operatorId: dto.operatorId,
        billingId: dto.billingId,
        remark: dto.remark ?? 'billing_deduction',
      }))

      return card
    })
  }

  async getCardLogs(cardId: number, dto: QueryMemberCardLogDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const card = await this.cardRepository.findOneBy({ id: cardId, tenantId })
    if (!card)
      throw new BadRequestException('Member card not found')

    const { page = 1, pageSize = 10 } = dto
    const items = await paginate(
      this.logRepository.createQueryBuilder('log')
        .where('log.cardId = :cardId', { cardId })
        .andWhere('log.tenantId = :tenantId', { tenantId })
        .andWhere('log.areaId = :areaId', { areaId })
        .orderBy('log.createdAt', 'DESC'),
      { page, pageSize },
    )

    const customer = await this.customerRepository.findOneBy({ id: card.customerId, tenantId })
    return {
      ...items,
      card: {
        ...card,
        customer,
      },
    }
  }

  async getBalance(customerId: number, context?: Pick<IAuthUser, 'tenantId'>): Promise<{ cardNo: string, balance: number, points: number } | null> {
    const { tenantId } = requireTenantContext(context)
    const card = await this.cardRepository.findOneBy({ customerId, tenantId })
    if (!card)
      return null
    return { cardNo: card.cardNo, balance: Number(card.balance), points: card.points }
  }

  private async generateCardNo(context: Pick<IAuthUser, 'tenantId'>) {
    const { tenantId } = requireTenantContext(context)
    const date = this.getTodaySequenceDate()
    const prefix = `MC${date}`
    const latestCard = await this.cardRepository
      .createQueryBuilder('card')
      .select(['card.cardNo'])
      .where('card.cardNo LIKE :prefix', { prefix: `${prefix}%` })
      .andWhere('card.tenantId = :tenantId', { tenantId })
      .orderBy('card.cardNo', 'DESC')
      .getOne()

    const currentSeq = latestCard?.cardNo
      ? Number(latestCard.cardNo.slice(prefix.length)) || 0
      : 0
    return `${prefix}${String(currentSeq + 1).padStart(4, '0')}`
  }

  private getTodaySequenceDate() {
    const now = new Date()
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  }
}
