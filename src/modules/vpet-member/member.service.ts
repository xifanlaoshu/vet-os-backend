import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
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
  ) {}

  async openCard(dto: OpenCardDto): Promise<MemberCardEntity> {
    const existing = await this.cardRepository.findOneBy({ customerId: dto.customerId })
    if (existing)
      throw new BadRequestException('Member card already exists for this customer')

    const initialBalance = dto.initialBalance ?? 0
    const giftAmount = dto.giftAmount ?? 0

    const card = this.cardRepository.create({
      customerId: dto.customerId,
      cardNo: await this.generateCardNo(),
      level: dto.level ?? 1,
      balance: initialBalance,
      giftBalance: giftAmount,
      totalRecharge: initialBalance,
    })

    const saved = await this.cardRepository.save(card)

    if (initialBalance > 0) {
      await this.logRepository.save({
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

  async listCards(dto: QueryMemberCardDto) {
    const { page = 1, pageSize = 10, keyword, customerId, status, level } = dto
    const queryBuilder = this.cardRepository
      .createQueryBuilder('card')
      .leftJoin(CustomerEntity, 'customer', 'customer.id = card.customerId')
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

  async getCardByCustomer(customerId: number): Promise<MemberCardEntity | null> {
    return this.cardRepository.findOneBy({ customerId })
  }

  async getCardById(id: number): Promise<MemberCardEntity | null> {
    return this.cardRepository.findOneBy({ id })
  }

  async recharge(cardId: number, dto: RechargeDto): Promise<MemberCardEntity> {
    const card = await this.cardRepository.findOneBy({ id: cardId })
    if (!card)
      throw new BadRequestException('Member card not found')

    const balanceBefore = Number(card.balance)
    card.balance = balanceBefore + dto.amount
    card.totalRecharge = Number(card.totalRecharge) + dto.amount

    await this.cardRepository.save(card)
    await this.logRepository.save({
      cardId,
      type: 1,
      amount: dto.amount,
      direction: 1,
      balanceBefore,
      balanceAfter: card.balance,
      operatorId: dto.operatorId,
      remark: dto.remark ?? 'recharge',
    })

    return card
  }

  async deduct(cardId: number, dto: DeductDto): Promise<MemberCardEntity> {
    const card = await this.cardRepository.findOneBy({ id: cardId })
    if (!card)
      throw new BadRequestException('Member card not found')
    if (Number(card.balance) < dto.amount)
      throw new BadRequestException('Insufficient balance')

    const balanceBefore = Number(card.balance)
    card.balance = balanceBefore - dto.amount
    card.totalSpend = Number(card.totalSpend) + dto.amount

    await this.cardRepository.save(card)
    await this.logRepository.save({
      cardId,
      type: 3,
      amount: dto.amount,
      direction: 2,
      balanceBefore,
      balanceAfter: card.balance,
      operatorId: dto.operatorId,
      billingId: dto.billingId,
      remark: dto.remark ?? 'billing_deduction',
    })

    return card
  }

  async getCardLogs(cardId: number, dto: QueryMemberCardLogDto) {
    const card = await this.cardRepository.findOneBy({ id: cardId })
    if (!card)
      throw new BadRequestException('Member card not found')

    const { page = 1, pageSize = 10 } = dto
    const items = await paginate(
      this.logRepository.createQueryBuilder('log')
        .where('log.cardId = :cardId', { cardId })
        .orderBy('log.createdAt', 'DESC'),
      { page, pageSize },
    )

    const customer = await this.customerRepository.findOneBy({ id: card.customerId })
    return {
      ...items,
      card: {
        ...card,
        customer,
      },
    }
  }

  async getBalance(customerId: number): Promise<{ cardNo: string, balance: number, points: number } | null> {
    const card = await this.cardRepository.findOneBy({ customerId })
    if (!card)
      return null
    return { cardNo: card.cardNo, balance: Number(card.balance), points: card.points }
  }

  private async generateCardNo() {
    const date = this.getTodaySequenceDate()
    const prefix = `MC${date}`
    const latestCard = await this.cardRepository
      .createQueryBuilder('card')
      .select(['card.cardNo'])
      .where('card.cardNo LIKE :prefix', { prefix: `${prefix}%` })
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
