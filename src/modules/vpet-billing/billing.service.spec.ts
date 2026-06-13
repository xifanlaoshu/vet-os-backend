import { BusinessException } from '~/common/exceptions/biz.exception'

import { BillingService } from './billing.service'

function createBillingService() {
  return new BillingService(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  ) as any
}

function createCardRepository(card: any) {
  const qb: any = {
    setLock: jest.fn(() => qb),
    where: jest.fn(() => qb),
    andWhere: jest.fn(() => qb),
    getOne: jest.fn(async () => card),
  }
  return {
    findOneBy: jest.fn(async () => card),
    createQueryBuilder: jest.fn(() => qb),
    qb,
  }
}

describe('billingService member-card payment boundaries', () => {
  it('rejects explicit member-card payments when the card belongs to another customer', async () => {
    const service = createBillingService()
    const cardRepository = createCardRepository({
      id: 12,
      tenantId: 2,
      customerId: 99,
      balance: 100,
    })

    await expect(service.resolveMemberCard(
      cardRepository,
      {
        paymentMethod: 4,
        paidAmount: 20,
        memberCardId: 12,
      },
      {
        id: 8,
        tenantId: 2,
        areaId: 3,
        customerId: 5,
      },
      2,
    )).rejects.toBeInstanceOf(BusinessException)
    expect(cardRepository.qb.setLock).toHaveBeenCalledWith('pessimistic_write')
    expect(cardRepository.qb.where).toHaveBeenCalledWith('card.id = :memberCardId', { memberCardId: 12 })
    expect(cardRepository.qb.andWhere).toHaveBeenCalledWith('card.tenantId = :tenantId', { tenantId: 2 })
  })

  it('rejects member-card payments when the requested customer differs from the bill customer', async () => {
    const service = createBillingService()
    const cardRepository = createCardRepository({
      id: 13,
      tenantId: 2,
      customerId: 99,
      balance: 100,
    })

    await expect(service.resolveMemberCard(
      cardRepository,
      {
        paymentMethod: 4,
        paidAmount: 20,
        customerId: 99,
      },
      {
        id: 8,
        tenantId: 2,
        areaId: 3,
        customerId: 5,
      },
      2,
    )).rejects.toBeInstanceOf(BusinessException)
    expect(cardRepository.findOneBy).not.toHaveBeenCalled()
  })

  it('allows member-card payments only for the billing customer and checks balance', async () => {
    const service = createBillingService()
    const card = {
      id: 14,
      tenantId: 2,
      customerId: 5,
      status: 1,
      balance: 100,
    }
    const cardRepository = createCardRepository(card)

    await expect(service.resolveMemberCard(
      cardRepository,
      {
        paymentMethod: 4,
        paidAmount: 20,
        memberCardId: 14,
      },
      {
        id: 8,
        tenantId: 2,
        areaId: 3,
        customerId: 5,
      },
      2,
    )).resolves.toBe(card)
  })
})

describe('billingService amount recalculation boundaries', () => {
  it('recalculates billing totals only from details in the current tenant and area', async () => {
    const service = createBillingService()
    const detailRepository = {
      find: jest.fn(async () => [
        { amount: 12.5 },
        { amount: 7.5 },
      ]),
    }
    const billingRepository = {
      update: jest.fn(async () => ({ affected: 1 })),
    }

    await service.recalculateBill(billingRepository, detailRepository, 8, { tenantId: 2, areaId: 3 })

    expect(detailRepository.find).toHaveBeenCalledWith({
      where: {
        billingId: 8,
        tenantId: 2,
        areaId: 3,
      },
    })
    expect(billingRepository.update).toHaveBeenCalledWith(
      { id: 8, tenantId: 2, areaId: 3 },
      { totalAmount: 20 },
    )
  })
})

describe('billingService payment transaction safety', () => {
  function createLockedBillingTransaction(bill: any) {
    const billQb: any = {
      setLock: jest.fn(() => billQb),
      leftJoinAndSelect: jest.fn(() => billQb),
      where: jest.fn(() => billQb),
      andWhere: jest.fn(() => billQb),
      getOne: jest.fn(async () => bill),
    }
    const paymentSave = jest.fn(async (value: any) => ({ ...value, paidAt: '2026-06-13 10:00:00' }))
    const paymentFind = jest.fn(async () => [{ paymentMethod: 1, direction: 1, amount: 20 }])
    const billingUpdate = jest.fn(async () => ({ affected: 1 }))
    const billingFindOne = jest.fn(async () => ({ id: 8, paymentStatus: 2 }))
    const dataSource = {
      transaction: jest.fn(async (callback: any) => callback({
        getRepository: jest.fn((entity: any) => {
          if (entity.name === 'BillingEntity') {
            return {
              createQueryBuilder: jest.fn(() => billQb),
              update: billingUpdate,
              findOne: billingFindOne,
            }
          }
          if (entity.name === 'BillingPaymentEntity') {
            return {
              create: jest.fn((value: any) => value),
              save: paymentSave,
              find: paymentFind,
            }
          }
          return {
            create: jest.fn((value: any) => value),
            save: jest.fn(async (value: any) => value),
            createQueryBuilder: jest.fn(() => ({
              setLock: jest.fn(),
            })),
          }
        }),
      })),
    }
    return { dataSource, billQb, paymentSave, billingUpdate }
  }

  it('locks billing rows before payment and rejects missing scoped bills', async () => {
    const { dataSource, billQb, paymentSave } = createLockedBillingTransaction(null)
    const service = new BillingService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      dataSource as any,
    ) as any

    await expect(service.processPayment(8, { paymentMethod: 1, paidAmount: 20 }, { tenantId: 2, areaId: 3 }))
      .rejects
      .toBeInstanceOf(BusinessException)

    expect(billQb.setLock).toHaveBeenCalledWith('pessimistic_write')
    expect(paymentSave).not.toHaveBeenCalled()
  })

  it('rejects zero payment amounts before opening a transaction', async () => {
    const dataSource = { transaction: jest.fn() }
    const service = new BillingService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      dataSource as any,
    ) as any

    await expect(service.processPayment(8, { paymentMethod: 1, paidAmount: 0 }, { tenantId: 2, areaId: 3 }))
      .rejects
      .toBeInstanceOf(BusinessException)
    expect(dataSource.transaction).not.toHaveBeenCalled()
  })

  it('locks billing rows before refunding', async () => {
    const bill = {
      id: 8,
      totalAmount: 100,
      discount: 0,
      customerId: 5,
      payments: [{ id: 1, paymentMethod: 1, direction: 1, amount: 50, createdAt: '2026-06-13 10:00:00' }],
    }
    const { dataSource, billQb, billingUpdate } = createLockedBillingTransaction(bill)
    const service = new BillingService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      dataSource as any,
    ) as any

    await service.processRefund(8, { refundAmount: 20 }, { tenantId: 2, areaId: 3 })

    expect(billQb.setLock).toHaveBeenCalledWith('pessimistic_write')
    expect(billingUpdate).toHaveBeenCalled()
  })
})
