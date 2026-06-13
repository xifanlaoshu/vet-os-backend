import { BusinessException } from '~/common/exceptions/biz.exception'

import { ConsentService } from './consent.service'

function createConsentService(overrides: {
  templateRepository?: any
  recordRepository?: any
  visitRepository?: any
  customerRepository?: any
  petRepository?: any
  doctorRepository?: any
} = {}) {
  return new ConsentService(
    overrides.templateRepository ?? {} as any,
    overrides.recordRepository ?? {} as any,
    overrides.visitRepository ?? {} as any,
    overrides.customerRepository ?? {} as any,
    overrides.petRepository ?? {} as any,
    overrides.doctorRepository ?? {} as any,
  ) as any
}

describe('consentService record workflow boundaries', () => {
  it('rejects consent record creation when the linked visit is outside the current area', async () => {
    const save = jest.fn()
    const service = createConsentService({
      templateRepository: {
        findOneBy: jest.fn(async () => ({ id: 1, isActive: 1, content: 'content' })),
      },
      visitRepository: {
        findOne: jest.fn(async () => null),
      },
      recordRepository: {
        create: jest.fn((value: any) => value),
        save,
      },
    })

    await expect(service.createRecord({
      templateId: 1,
      visitId: 8,
      customerId: 5,
      petId: 6,
    }, { tenantId: 2, areaId: 3 })).rejects.toBeInstanceOf(BusinessException)

    expect(save).not.toHaveBeenCalled()
  })

  it('rejects consent record creation when the selected customer differs from the visit customer', async () => {
    const save = jest.fn()
    const service = createConsentService({
      templateRepository: {
        findOneBy: jest.fn(async () => ({ id: 1, isActive: 1, content: 'content' })),
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
      recordRepository: {
        create: jest.fn((value: any) => value),
        save,
      },
    })

    await expect(service.createRecord({
      templateId: 1,
      visitId: 8,
      customerId: 99,
      petId: 6,
      doctorId: 7,
    }, { tenantId: 2, areaId: 3 })).rejects.toBeInstanceOf(BusinessException)

    expect(save).not.toHaveBeenCalled()
  })

  it('rejects consent record creation when the selected doctor differs from the visit doctor', async () => {
    const save = jest.fn()
    const service = createConsentService({
      templateRepository: {
        findOneBy: jest.fn(async () => ({ id: 1, isActive: 1, content: 'content' })),
      },
      visitRepository: {
        findOne: jest.fn(async () => ({ id: 8, customerId: 5, petId: 6, doctorId: 7 })),
      },
      customerRepository: {
        findOneBy: jest.fn(async () => ({ id: 5, name: 'Visit Customer' })),
      },
      petRepository: {
        findOneBy: jest.fn(async () => ({ id: 6, customerId: 5 })),
      },
      doctorRepository: {
        findOneBy: jest.fn(async () => ({ id: 77 })),
      },
      recordRepository: {
        create: jest.fn((value: any) => value),
        save,
      },
    })

    await expect(service.createRecord({
      templateId: 1,
      visitId: 8,
      customerId: 5,
      petId: 6,
      doctorId: 77,
    }, { tenantId: 2, areaId: 3 })).rejects.toBeInstanceOf(BusinessException)

    expect(save).not.toHaveBeenCalled()
  })

  it('rejects signing consent records that are already signed', async () => {
    const update = jest.fn()
    const service = createConsentService({
      recordRepository: {
        findOneBy: jest.fn(async () => ({ id: 8, status: 2 })),
        update,
      },
    })

    await expect(service.signRecord(8, { guardianName: 'Guardian' }, { tenantId: 2, areaId: 3 }))
      .rejects
      .toBeInstanceOf(BusinessException)
    expect(update).not.toHaveBeenCalled()
  })

  it('rejects voiding consent records that are already signed', async () => {
    const update = jest.fn()
    const service = createConsentService({
      recordRepository: {
        findOneBy: jest.fn(async () => ({ id: 8, status: 2 })),
        update,
      },
    })

    await expect(service.voidRecord(8, { tenantId: 2, areaId: 3 }))
      .rejects
      .toBeInstanceOf(BusinessException)
    expect(update).not.toHaveBeenCalled()
  })

  it('keeps void idempotent for already voided consent records', async () => {
    const update = jest.fn()
    const service = createConsentService({
      recordRepository: {
        findOneBy: jest.fn(async () => ({ id: 8, status: 3 })),
        update,
      },
    })

    await service.voidRecord(8, { tenantId: 2, areaId: 3 })

    expect(update).not.toHaveBeenCalled()
  })
})
