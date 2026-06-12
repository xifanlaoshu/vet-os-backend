import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { BusinessException } from '~/common/exceptions/biz.exception'
import { paginate } from '~/helper/paginate'
import { MemberCardLogEntity } from '../vpet-member/entities/member-card-log.entity'
import { MemberCardEntity } from '../vpet-member/entities/member-card.entity'
import { PrescriptionEntity } from '../vpet-prescription/entities/prescription.entity'
import { VisitEntity } from '../vpet-visit/entities/visit.entity'
import { CreateBillingDto, PaymentDto, QueryBillingDto, RefundDto } from './dto/billing.dto'
import { BillDetailEntity } from './entities/bill-detail.entity'
import { BillingPaymentEntity } from './entities/billing-payment.entity'
import { BillingEntity } from './entities/billing.entity'
import { OperationAuditLogEntity } from './entities/operation-audit-log.entity'

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(BillingEntity)
    private billingRepository: Repository<BillingEntity>,
    @InjectRepository(BillDetailEntity)
    private detailRepository: Repository<BillDetailEntity>,
    @InjectRepository(BillingPaymentEntity)
    private paymentRepository: Repository<BillingPaymentEntity>,
    @InjectRepository(VisitEntity)
    private visitRepository: Repository<VisitEntity>,
    @InjectRepository(PrescriptionEntity)
    private prescriptionRepository: Repository<PrescriptionEntity>,
    private dataSource: DataSource,
  ) {}

  async createBill(dto: CreateBillingDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>): Promise<any> {
    const tenantId = context?.tenantId ?? 1
    const areaId = context?.areaId ?? 1
    const visit = await this.visitRepository.findOne({
      where: { id: dto.visitId, tenantId, areaId },
      relations: ['customer', 'pet'],
    })
    if (!visit)
      throw new BusinessException('Visit not found')
    const resolvedCustomerId = dto.customerId ?? visit.customerId
    if (!resolvedCustomerId) {
      throw new BusinessException('Billing customer is required')
    }
    if (visit.customerId && Number(visit.customerId) !== Number(resolvedCustomerId)) {
      throw new BusinessException('Billing customer does not match visit customer')
    }

    const billNo = await this.generateBillNo()
    let totalAmount = 0

    const details = dto.details.map((detail) => {
      const amount = Number(detail.quantity ?? 1) * Number(detail.unitPrice ?? 0)
      totalAmount += amount
      return this.detailRepository.create({
        ...detail,
        tenantId,
        areaId,
        amount,
        itemSnapshot: detail.itemSnapshot ?? {
          itemType: detail.itemType,
          itemId: detail.itemId ?? null,
          itemName: detail.itemName,
          unitPrice: detail.unitPrice,
          quantity: detail.quantity ?? 1,
        },
      })
    })

    const bill = this.billingRepository.create({
      billNo,
      tenantId,
      areaId,
      visitId: dto.visitId,
      customerId: resolvedCustomerId,
      petId: dto.petId ?? visit.petId ?? null,
      totalAmount,
      discount: dto.discount ?? 0,
      paidAmount: 0,
      paymentStatus: 1,
      paymentMethod: dto.paymentMethod,
      customerSnapshot: visit.customer
        ? { id: visit.customer.id, name: visit.customer.name, phone: visit.customer.phone }
        : null,
      petSnapshot: visit.pet
        ? { id: visit.pet.id, name: visit.pet.name, species: visit.pet.species, breed: visit.pet.breed }
        : null,
      details,
    })

    const saved = await this.billingRepository.save(bill)
    return this.getById(saved.id, { tenantId, areaId })
  }

  async syncVisitPrescriptionBilling(visitId: number, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>): Promise<BillingEntity[]> {
    const tenantId = context?.tenantId ?? 1
    const areaId = context?.areaId ?? 1
    return this.dataSource.transaction(async (manager) => {
      const visitRepository = manager.getRepository(VisitEntity)
      const billingRepository = manager.getRepository(BillingEntity)
      const detailRepository = manager.getRepository(BillDetailEntity)
      const prescriptionRepository = manager.getRepository(PrescriptionEntity)

      const visit = await visitRepository.findOne({
        where: { id: visitId, tenantId, areaId },
        relations: ['customer', 'pet'],
      })
      if (!visit)
        throw new BusinessException('Visit not found')

      const bills = await billingRepository.find({
        where: { visitId, tenantId, areaId },
        relations: ['details', 'payments'],
        order: { createdAt: 'ASC' },
      })
      const billedSourceIds = new Set<number>()
      bills.forEach((bill) => {
        ;(bill.details || []).forEach((detail) => {
          if (detail.sourceType === 'prescription_detail' && detail.sourceId) {
            billedSourceIds.add(Number(detail.sourceId))
          }
        })
      })

      const prescriptions = await prescriptionRepository.find({
        where: { visitId, tenantId, areaId },
        relations: ['details'],
        order: { createdAt: 'ASC' },
      })
      const pendingDetails = prescriptions
        .filter(prescription => Number(prescription.status) !== 5)
        .flatMap(prescription =>
          (prescription.details || []).map(detail => ({ prescription, detail })),
        )
        .filter(({ detail }) => !billedSourceIds.has(Number(detail.id)))

      if (!pendingDetails.length) {
        return billingRepository.find({
          where: { visitId, tenantId, areaId },
          relations: ['details', 'payments'],
          order: { createdAt: 'DESC' },
        })
      }

      let targetBill = bills.filter(item => [1, 2].includes(Number(item.paymentStatus))).at(-1)
      if (!targetBill) {
        targetBill = await billingRepository.save(billingRepository.create({
          billNo: await this.generateBillNo(),
          tenantId,
          areaId,
          visitId,
          customerId: visit.customerId,
          petId: visit.petId ?? null,
          totalAmount: 0,
          discount: 0,
          paidAmount: 0,
          paymentStatus: 1,
          customerSnapshot: visit.customer
            ? { id: visit.customer.id, name: visit.customer.name, phone: visit.customer.phone }
            : null,
          petSnapshot: visit.pet
            ? { id: visit.pet.id, name: visit.pet.name, species: visit.pet.species, breed: visit.pet.breed }
            : null,
        }))
      }

      await detailRepository.save(pendingDetails.map(({ prescription, detail }) => detailRepository.create({
        tenantId,
        areaId,
        billingId: targetBill!.id,
        itemType: Number(detail.itemKind ?? 1) === 2 ? 4 : 3,
        itemName: detail.itemName || detail.drugName,
        itemId: detail.itemId ?? detail.drugId ?? detail.chargeItemId ?? null,
        sourceType: 'prescription_detail',
        sourceId: detail.id,
        quantity: detail.quantity ?? 1,
        unitPrice: detail.unitPrice,
        amount: detail.amount,
        itemSnapshot: {
          prescriptionId: prescription.id,
          rxNo: prescription.rxNo,
          itemKind: detail.itemKind ?? 1,
          itemId: detail.itemId ?? detail.drugId ?? detail.chargeItemId ?? null,
          itemName: detail.itemName || detail.drugName,
          drugId: detail.drugId,
          chargeItemId: detail.chargeItemId,
          drugName: detail.drugName,
          specification: detail.specification,
          dosageUnit: detail.dosageUnit,
          quantity: detail.quantity,
          unitPrice: detail.unitPrice,
          amount: detail.amount,
        },
      })))

      await this.recalculateBill(billingRepository, detailRepository, targetBill.id)
      return billingRepository.find({
        where: { visitId, tenantId, areaId },
        relations: ['details', 'payments'],
        order: { createdAt: 'DESC' },
      })
    })
  }

  async processPayment(id: number, dto: PaymentDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>): Promise<any> {
    const tenantId = context?.tenantId ?? 1
    const areaId = context?.areaId ?? 1
    return this.dataSource.transaction(async (manager) => {
      const billingRepository = manager.getRepository(BillingEntity)
      const paymentRepository = manager.getRepository(BillingPaymentEntity)
      const logRepository = manager.getRepository(MemberCardLogEntity)
      const cardRepository = manager.getRepository(MemberCardEntity)

      const bill = await billingRepository.findOne({
        where: { id, tenantId, areaId },
        relations: ['details', 'payments'],
      })
      if (!bill)
        return null

      const currentDue = Math.max(
        Number(bill.totalAmount) - Number(bill.discount ?? 0) - this.calculatePaidAmount(bill.payments ?? []),
        0,
      )
      if (dto.paidAmount > currentDue) {
        throw new BusinessException('Payment exceeds outstanding amount')
      }

      if (dto.paymentMethod === 4) {
        const card = await this.resolveMemberCard(cardRepository, dto, bill, tenantId)
        const balanceBefore = Number(card.balance)
        card.balance = balanceBefore - dto.paidAmount
        card.totalSpend = Number(card.totalSpend) + dto.paidAmount
        await cardRepository.save(card)
        await logRepository.save(logRepository.create({
          tenantId,
          areaId,
          cardId: card.id,
          type: 3,
          amount: dto.paidAmount,
          direction: 2,
          balanceBefore,
          balanceAfter: card.balance,
          operatorId: dto.cashierId,
          billingId: id,
          remark: dto.remark ?? 'member_card_payment',
        }))
      }

      const payment = paymentRepository.create({
        tenantId,
        areaId,
        billingId: id,
        paymentMethod: dto.paymentMethod,
        amount: dto.paidAmount,
        direction: 1,
        tradeNo: dto.tradeNo,
        operatorId: dto.cashierId,
        paidAt: new Date().toISOString(),
        status: 1,
        remark: dto.remark,
      })
      await paymentRepository.save(payment)

      const payments = await paymentRepository.find({
        where: { billingId: id, tenantId, areaId },
        order: { createdAt: 'ASC' },
      })
      const totalPaid = this.calculatePaidAmount(payments)
      const dueAmount = Math.max(Number(bill.totalAmount) - Number(bill.discount ?? 0), 0)
      const distinctMethods = Array.from(new Set<number>(payments.map(item => Number(item.paymentMethod))))
      const paymentStatus = this.resolvePaymentStatus(payments, dueAmount)

      await billingRepository.update({ id, tenantId, areaId }, {
        paymentMethod: distinctMethods.length > 1 ? 5 : (distinctMethods[0] ?? dto.paymentMethod),
        paidAmount: totalPaid,
        paymentStatus,
        paidAt: payment.paidAt,
        cashierId: dto.cashierId,
      })

      return billingRepository.findOne({
        where: { id, tenantId, areaId },
        relations: ['details', 'payments'],
      })
    })
  }

  async processRefund(id: number, dto: RefundDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>): Promise<any> {
    const tenantId = context?.tenantId ?? 1
    const areaId = context?.areaId ?? 1
    return this.dataSource.transaction(async (manager) => {
      const billingRepository = manager.getRepository(BillingEntity)
      const paymentRepository = manager.getRepository(BillingPaymentEntity)
      const cardRepository = manager.getRepository(MemberCardEntity)
      const logRepository = manager.getRepository(MemberCardLogEntity)
      const auditRepository = manager.getRepository(OperationAuditLogEntity)

      const bill = await billingRepository.findOne({
        where: { id, tenantId, areaId },
        relations: ['details', 'payments'],
      })
      if (!bill)
        return null

      const refundAmount = Number(dto.refundAmount || 0)
      if (refundAmount <= 0) {
        throw new BusinessException('Refund amount must be greater than 0')
      }

      const currentPaid = this.calculatePaidAmount(bill.payments ?? [])
      if (currentPaid <= 0) {
        throw new BusinessException('No refundable paid amount')
      }
      if (refundAmount > currentPaid) {
        throw new BusinessException('Refund exceeds refundable amount')
      }

      const sourcePayment = this.resolveRefundSourcePayment(bill.payments ?? [], dto.paymentId)
      if (!sourcePayment) {
        throw new BusinessException('Refund source payment not found')
      }

      const beforeSnapshot = this.buildBillingSnapshot(bill)

      if (Number(sourcePayment.paymentMethod) === 4) {
        const card = await this.resolveRefundMemberCard(cardRepository, tenantId, bill.customerId)
        const balanceBefore = Number(card.balance)
        card.balance = balanceBefore + refundAmount
        card.totalSpend = Math.max(Number(card.totalSpend || 0) - refundAmount, 0)
        await cardRepository.save(card)
        await logRepository.save(logRepository.create({
          tenantId,
          areaId,
          cardId: card.id,
          type: 2,
          amount: refundAmount,
          direction: 1,
          balanceBefore,
          balanceAfter: card.balance,
          operatorId: dto.operatorId,
          billingId: id,
          remark: dto.reason ?? 'billing_refund',
        }))
      }

      await paymentRepository.save(paymentRepository.create({
        tenantId,
        areaId,
        billingId: id,
        paymentMethod: sourcePayment.paymentMethod,
        amount: refundAmount,
        direction: 2,
        tradeNo: sourcePayment.tradeNo,
        operatorId: dto.operatorId,
        paidAt: new Date().toISOString(),
        status: 1,
        remark: dto.reason,
      }))

      const payments = await paymentRepository.find({
        where: { billingId: id, tenantId, areaId },
        order: { createdAt: 'ASC' },
      })
      const totalPaid = this.calculatePaidAmount(payments)
      const dueAmount = Math.max(Number(bill.totalAmount) - Number(bill.discount ?? 0), 0)
      const distinctMethods = Array.from(new Set<number>(payments.map(item => Number(item.paymentMethod))))
      const paymentStatus = this.resolvePaymentStatus(payments, dueAmount)

      await billingRepository.update({ id, tenantId, areaId }, {
        paymentMethod: distinctMethods.length > 1 ? 5 : (distinctMethods[0] ?? sourcePayment.paymentMethod),
        paidAmount: totalPaid,
        paymentStatus,
        cashierId: dto.operatorId ?? bill.cashierId,
      })

      const updatedBill = await billingRepository.findOne({
        where: { id, tenantId, areaId },
        relations: ['details', 'payments'],
      })

      await auditRepository.save(auditRepository.create({
        tenantId,
        areaId,
        bizType: 'billing',
        bizId: id,
        action: 'refund',
        beforeSnapshot,
        afterSnapshot: this.buildBillingSnapshot(updatedBill),
        reason: dto.reason,
        operatorId: dto.operatorId,
      }))

      return updatedBill
    })
  }

  async list(dto: QueryBillingDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { page = 1, pageSize = 10, customerId, visitId, paymentStatus } = dto
    const qb = this.billingRepository.createQueryBuilder('b')
      .andWhere('b.tenantId = :tenantId', { tenantId: context?.tenantId ?? 1 })
      .andWhere('b.areaId = :areaId', { areaId: context?.areaId ?? 1 })

    if (customerId)
      qb.andWhere('b.customerId = :customerId', { customerId })
    if (visitId)
      qb.andWhere('b.visitId = :visitId', { visitId })
    if (paymentStatus !== undefined)
      qb.andWhere('b.paymentStatus = :paymentStatus', { paymentStatus })

    qb.orderBy('b.createdAt', 'DESC')
    return paginate(qb, { page, pageSize })
  }

  async getById(id: number, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>): Promise<any> {
    return this.billingRepository.findOne({
      where: { id, tenantId: context?.tenantId ?? 1, areaId: context?.areaId ?? 1 },
      relations: ['details', 'payments'],
    })
  }

  async getByVisit(visitId: number, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>): Promise<BillingEntity[]> {
    return this.billingRepository.find({
      where: { visitId, tenantId: context?.tenantId ?? 1, areaId: context?.areaId ?? 1 },
      relations: ['details', 'payments'],
      order: { createdAt: 'DESC' },
    })
  }

  async getTodayStats(context?: Pick<IAuthUser, 'tenantId' | 'areaId'>): Promise<any> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const revenue = await this.paymentRepository
      .createQueryBuilder('p')
      .select('COUNT(DISTINCT p.billing_id)', 'billCount')
      .addSelect('COALESCE(SUM(CASE WHEN p.direction = 1 THEN p.amount ELSE -p.amount END), 0)', 'totalRevenue')
      .where('p.paidAt >= :today', { today })
      .andWhere('p.tenantId = :tenantId', { tenantId: context?.tenantId ?? 1 })
      .andWhere('p.areaId = :areaId', { areaId: context?.areaId ?? 1 })
      .andWhere('p.status = 1')
      .getRawOne()

    const discount = await this.billingRepository
      .createQueryBuilder('b')
      .select('COALESCE(SUM(b.discount), 0)', 'totalDiscount')
      .where('b.paidAt >= :today', { today })
      .andWhere('b.tenantId = :tenantId', { tenantId: context?.tenantId ?? 1 })
      .andWhere('b.areaId = :areaId', { areaId: context?.areaId ?? 1 })
      .andWhere('b.paymentStatus IN (:...statuses)', { statuses: [2, 3] })
      .getRawOne()

    return {
      billCount: Number(revenue?.billCount ?? 0),
      totalRevenue: Number(revenue?.totalRevenue ?? 0),
      totalDiscount: Number(discount?.totalDiscount ?? 0),
    }
  }

  private calculatePaidAmount(payments: BillingPaymentEntity[]) {
    return payments.reduce((sum, item) => {
      const delta = item.direction === 2 ? -Number(item.amount) : Number(item.amount)
      return sum + delta
    }, 0)
  }

  private resolvePaymentStatus(payments: BillingPaymentEntity[], dueAmount: number) {
    const totalPaid = this.calculatePaidAmount(payments)
    const hasRefund = payments.some(item => Number(item.direction) === 2)
    if (hasRefund && totalPaid <= 0)
      return 4
    if (hasRefund && totalPaid < dueAmount)
      return 5
    if (totalPaid <= 0)
      return 1
    if (totalPaid < dueAmount)
      return 2
    return 3
  }

  private resolveRefundSourcePayment(payments: BillingPaymentEntity[], paymentId?: number) {
    const incomePayments = payments
      .filter(item => Number(item.direction) === 1)
      .sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime()
        const timeB = new Date(b.createdAt).getTime()
        if (timeA !== timeB)
          return timeA - timeB
        return Number(a.id) - Number(b.id)
      })
    if (paymentId) {
      return incomePayments.find(item => Number(item.id) === Number(paymentId))
    }
    return incomePayments.at(-1)
  }

  private async resolveRefundMemberCard(
    cardRepository: Repository<MemberCardEntity>,
    tenantId: number,
    customerId?: number,
  ) {
    if (!customerId)
      throw new BusinessException('Customer id is required for member refund')
    const card = await cardRepository.findOneBy({ customerId, tenantId })
    if (!card)
      throw new BusinessException('Customer has no member card')
    return card
  }

  private buildBillingSnapshot(bill?: BillingEntity | null) {
    if (!bill)
      return null
    return {
      id: bill.id,
      billNo: bill.billNo,
      visitId: bill.visitId,
      customerId: bill.customerId,
      petId: bill.petId,
      totalAmount: Number(bill.totalAmount || 0),
      discount: Number(bill.discount || 0),
      paidAmount: Number(bill.paidAmount || 0),
      paymentStatus: bill.paymentStatus,
      paymentMethod: bill.paymentMethod,
      payments: (bill.payments || []).map(payment => ({
        id: payment.id,
        paymentMethod: payment.paymentMethod,
        amount: Number(payment.amount || 0),
        direction: payment.direction,
        status: payment.status,
        paidAt: payment.paidAt,
      })),
    }
  }

  private async resolveMemberCard(
    cardRepository: Repository<MemberCardEntity>,
    dto: PaymentDto,
    bill: BillingEntity,
    tenantId: number,
  ) {
    let card: MemberCardEntity | null = null

    if (dto.memberCardId) {
      card = await cardRepository.findOneBy({ id: dto.memberCardId, tenantId })
      if (!card)
        throw new BusinessException('Member card not found')
    }
    else {
      const customerId = dto.customerId ?? bill.customerId
      if (!customerId)
        throw new BusinessException('Customer id is required for member payment')
      card = await cardRepository.findOneBy({ customerId, tenantId })
      if (!card)
        throw new BusinessException('Customer has no member card')
    }

    if (Number(card.balance) < dto.paidAmount) {
      throw new BusinessException('Insufficient member balance')
    }

    return card
  }

  private async recalculateBill(
    billingRepository: Repository<BillingEntity>,
    detailRepository: Repository<BillDetailEntity>,
    billId: number,
  ) {
    const details = await detailRepository.find({ where: { billingId: billId } })
    const totalAmount = details.reduce((sum, detail) => sum + Number(detail.amount ?? 0), 0)
    await billingRepository.update(billId, { totalAmount })
  }

  private async generateBillNo() {
    const date = this.getTodaySequenceDate()
    const prefix = `BILL${date}`
    const latestBill = await this.billingRepository
      .createQueryBuilder('b')
      .select(['b.billNo'])
      .where('b.billNo LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('b.billNo', 'DESC')
      .getOne()

    const currentSeq = latestBill?.billNo
      ? Number(latestBill.billNo.slice(prefix.length)) || 0
      : 0
    return `${prefix}${String(currentSeq + 1).padStart(4, '0')}`
  }

  private getTodaySequenceDate() {
    const now = new Date()
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  }
}
