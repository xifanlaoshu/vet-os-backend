import { BusinessException } from '~/common/exceptions/biz.exception'

import { LabService } from './lab.service'

function createLabService(overrides: {
  labOrderRepository?: any
  labResultItemRepository?: any
  lisOrderRepository?: any
  labTemplateRepository?: any
  visitRepository?: any
  customerRepository?: any
  petRepository?: any
  doctorRepository?: any
} = {}) {
  return new LabService(
    overrides.labOrderRepository ?? {} as any,
    overrides.labResultItemRepository ?? {} as any,
    overrides.lisOrderRepository ?? {} as any,
    overrides.labTemplateRepository ?? {} as any,
    overrides.visitRepository ?? {} as any,
    overrides.customerRepository ?? {} as any,
    overrides.petRepository ?? {} as any,
    overrides.doctorRepository ?? {} as any,
  ) as any
}

describe('labService visit consistency boundaries', () => {
  it('rejects lab order creation when the selected customer differs from the visit customer', async () => {
    const service = createLabService({
      labTemplateRepository: {
        findOneBy: jest.fn(async () => null),
      },
      visitRepository: {
        findOne: jest.fn(async () => ({ id: 8, customerId: 5, petId: 6, doctorId: 7 })),
      },
      customerRepository: {
        findOneBy: jest.fn(async () => ({ id: 99, name: 'Other Customer' })),
      },
      petRepository: {
        findOneBy: jest.fn(async () => ({ id: 6, customerId: 99 })),
      },
      doctorRepository: {
        findOneBy: jest.fn(async () => ({ id: 7 })),
      },
    })

    await expect(service.create({
      visitId: 8,
      customerId: 99,
      petId: 6,
      doctorId: 7,
      testName: 'CBC',
    }, { tenantId: 2, areaId: 3 })).rejects.toBeInstanceOf(BusinessException)
  })

  it('rejects lab order creation when the selected pet differs from the visit pet', async () => {
    const service = createLabService({
      labTemplateRepository: {
        findOneBy: jest.fn(async () => null),
      },
      visitRepository: {
        findOne: jest.fn(async () => ({ id: 8, customerId: 5, petId: 6, doctorId: 7 })),
      },
      customerRepository: {
        findOneBy: jest.fn(async () => ({ id: 5, name: 'Visit Customer' })),
      },
      petRepository: {
        findOneBy: jest.fn(async () => ({ id: 66, customerId: 5 })),
      },
      doctorRepository: {
        findOneBy: jest.fn(async () => ({ id: 7 })),
      },
    })

    await expect(service.create({
      visitId: 8,
      customerId: 5,
      petId: 66,
      doctorId: 7,
      testName: 'CBC',
    }, { tenantId: 2, areaId: 3 })).rejects.toBeInstanceOf(BusinessException)
  })
})

describe('labService LIS workflow boundaries', () => {
  it('rejects submitting completed lab orders to LIS', async () => {
    const update = jest.fn()
    const saveLis = jest.fn()
    const service = createLabService({
      labOrderRepository: {
        findOneBy: jest.fn(async () => ({ id: 8, status: 4 })),
        update,
      },
      lisOrderRepository: {
        findOneBy: jest.fn(async () => null),
        create: jest.fn((value: any) => value),
        save: saveLis,
      },
    })

    await expect(service.submitLisOrder(8, { deviceCode: 'CBC-01' }, { tenantId: 2, areaId: 3 }))
      .rejects
      .toBeInstanceOf(BusinessException)
    expect(saveLis).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })
})
