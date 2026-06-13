import { BusinessException } from '~/common/exceptions/biz.exception'

import { InsuranceService } from './insurance.service'

function createInsuranceService(overrides: {
  claimRepository?: any
  visitRepository?: any
  billingRepository?: any
  customerRepository?: any
  petRepository?: any
} = {}) {
  return new InsuranceService(
    overrides.claimRepository ?? {} as any,
    overrides.visitRepository ?? {} as any,
    overrides.billingRepository ?? {} as any,
    overrides.customerRepository ?? {} as any,
    overrides.petRepository ?? {} as any,
  ) as any
}

describe('insuranceService visit consistency boundaries', () => {
  it('rejects claims when the selected customer differs from the visit customer', async () => {
    const service = createInsuranceService({
      visitRepository: {
        findOneBy: jest.fn(async () => ({ id: 8, customerId: 5, petId: 6 })),
      },
      billingRepository: {
        findOneBy: jest.fn(async () => null),
      },
      customerRepository: {
        findOneBy: jest.fn(async () => ({ id: 99, name: 'Other Customer' })),
      },
      petRepository: {
        findOneBy: jest.fn(async () => ({ id: 6, customerId: 99 })),
      },
    })

    await expect(service.create({
      visitId: 8,
      customerId: 99,
      petId: 6,
      providerName: 'Pet Insurance',
      claimAmount: 100,
    }, { tenantId: 2, areaId: 3 })).rejects.toBeInstanceOf(BusinessException)
  })

  it('rejects claims when the selected pet differs from the visit pet', async () => {
    const service = createInsuranceService({
      visitRepository: {
        findOneBy: jest.fn(async () => ({ id: 8, customerId: 5, petId: 6 })),
      },
      billingRepository: {
        findOneBy: jest.fn(async () => null),
      },
      customerRepository: {
        findOneBy: jest.fn(async () => ({ id: 5, name: 'Visit Customer' })),
      },
      petRepository: {
        findOneBy: jest.fn(async () => ({ id: 66, customerId: 5 })),
      },
    })

    await expect(service.create({
      visitId: 8,
      customerId: 5,
      petId: 66,
      providerName: 'Pet Insurance',
      claimAmount: 100,
    }, { tenantId: 2, areaId: 3 })).rejects.toBeInstanceOf(BusinessException)
  })

  it('rejects claims when the selected bill belongs to another visit', async () => {
    const service = createInsuranceService({
      visitRepository: {
        findOneBy: jest.fn(async () => ({ id: 8, customerId: 5, petId: 6 })),
      },
      billingRepository: {
        findOneBy: jest.fn(async () => ({ id: 9, visitId: 88 })),
      },
      customerRepository: {
        findOneBy: jest.fn(async () => ({ id: 5, name: 'Visit Customer' })),
      },
      petRepository: {
        findOneBy: jest.fn(async () => ({ id: 6, customerId: 5 })),
      },
    })

    await expect(service.create({
      visitId: 8,
      billingId: 9,
      customerId: 5,
      petId: 6,
      providerName: 'Pet Insurance',
      claimAmount: 100,
    }, { tenantId: 2, areaId: 3 })).rejects.toBeInstanceOf(BusinessException)
  })
})

describe('insuranceService workflow state boundaries', () => {
  it('rejects submitting claims that are not drafts', async () => {
    const update = jest.fn()
    const service = createInsuranceService({
      claimRepository: {
        findOneBy: jest.fn(async () => ({ id: 8, status: 2 })),
        update,
      },
    })

    await expect(service.submit(8, { tenantId: 2, areaId: 3 })).rejects.toBeInstanceOf(BusinessException)
    expect(update).not.toHaveBeenCalled()
  })

  it('rejects settling claims that are not submitted', async () => {
    const update = jest.fn()
    const service = createInsuranceService({
      claimRepository: {
        findOneBy: jest.fn(async () => ({ id: 8, status: 1, claimAmount: 100 })),
        update,
      },
    })

    await expect(service.settle(8, { approvedAmount: 80 }, { tenantId: 2, areaId: 3 })).rejects.toBeInstanceOf(BusinessException)
    expect(update).not.toHaveBeenCalled()
  })

  it('rejects approved amounts that exceed the claim amount', async () => {
    const update = jest.fn()
    const service = createInsuranceService({
      claimRepository: {
        findOneBy: jest.fn(async () => ({ id: 8, status: 2, claimAmount: 100 })),
        update,
      },
    })

    await expect(service.settle(8, { approvedAmount: 120 }, { tenantId: 2, areaId: 3 })).rejects.toBeInstanceOf(BusinessException)
    expect(update).not.toHaveBeenCalled()
  })

  it('rejects workflow actions for claims outside the current area', async () => {
    const update = jest.fn()
    const service = createInsuranceService({
      claimRepository: {
        findOneBy: jest.fn(async () => null),
        update,
      },
    })

    await expect(service.submit(8, { tenantId: 2, areaId: 3 })).rejects.toBeInstanceOf(BusinessException)
    expect(update).not.toHaveBeenCalled()
  })
})
