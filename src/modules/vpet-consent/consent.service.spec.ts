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
