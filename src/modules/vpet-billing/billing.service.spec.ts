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
  return {
    findOneBy: jest.fn(async () => card),
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
    expect(cardRepository.findOneBy).toHaveBeenCalledWith({ id: 12, tenantId: 2 })
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
