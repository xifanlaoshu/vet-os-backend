import { BusinessException } from '~/common/exceptions/biz.exception'

import { PrescriptionService } from './prescription.service'

function createPrescriptionService(overrides: { doctorRepository?: any, rxRepository?: any, pharmacyService?: any } = {}) {
  return new PrescriptionService(
    overrides.rxRepository ?? {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    overrides.doctorRepository ?? {} as any,
    overrides.pharmacyService ?? {} as any,
  ) as any
}

describe('prescriptionService current-staff tenant boundaries', () => {
  it('resolves current medical staff only within the current tenant', async () => {
    const doctorRepository = {
      findOne: jest.fn(async () => ({ id: 31 })),
    }
    const service = createPrescriptionService({ doctorRepository })

    await expect(service.resolveCurrentStaffDoctorId(9, 2)).resolves.toBe(31)
    expect(doctorRepository.findOne).toHaveBeenCalledWith({
      where: {
        userId: 9,
        tenantId: 2,
        status: 1,
      },
    })
  })

  it('uses tenant-scoped current staff resolution when reviewing prescriptions', async () => {
    const doctorRepository = {
      findOne: jest.fn(async () => ({ id: 31 })),
    }
    const rxRepository = {
      findOneBy: jest.fn(async () => ({ id: 8, status: 2 })),
      update: jest.fn(async () => ({ affected: 1 })),
    }
    const service = createPrescriptionService({ doctorRepository, rxRepository })

    await service.reviewRx(8, { pharmacistId: 44, status: 3 }, {
      currentUserId: 9,
      tenantId: 2,
      areaId: 3,
    })

    expect(doctorRepository.findOne).toHaveBeenCalledWith({
      where: {
        userId: 9,
        tenantId: 2,
        status: 1,
      },
    })
    expect(rxRepository.update).toHaveBeenCalledWith(
      { id: 8, tenantId: 2, areaId: 3 },
      expect.objectContaining({
        status: 3,
        pharmacistId: 31,
      }),
    )
  })
})

describe('prescriptionService workflow state boundaries', () => {
  it('rejects submitting prescriptions that are not drafts', async () => {
    const update = jest.fn()
    const service = createPrescriptionService({
      rxRepository: {
        findOneBy: jest.fn(async () => ({ id: 8, status: 2 })),
        update,
      },
    })

    await expect(service.submitForReview(8, { tenantId: 2, areaId: 3 })).rejects.toBeInstanceOf(BusinessException)
    expect(update).not.toHaveBeenCalled()
  })

  it('rejects reviewing prescriptions that are not pending review', async () => {
    const update = jest.fn()
    const service = createPrescriptionService({
      rxRepository: {
        findOneBy: jest.fn(async () => ({ id: 8, status: 1 })),
        update,
      },
      doctorRepository: {
        findOne: jest.fn(async () => ({ id: 31 })),
      },
    })

    await expect(service.reviewRx(8, { pharmacistId: 44, status: 3 }, {
      currentUserId: 9,
      tenantId: 2,
      areaId: 3,
    })).rejects.toBeInstanceOf(BusinessException)
    expect(update).not.toHaveBeenCalled()
  })

  it('rejects unsupported review target statuses', async () => {
    const update = jest.fn()
    const service = createPrescriptionService({
      rxRepository: {
        findOneBy: jest.fn(async () => ({ id: 8, status: 2 })),
        update,
      },
      doctorRepository: {
        findOne: jest.fn(async () => ({ id: 31 })),
      },
    })

    await expect(service.reviewRx(8, { pharmacistId: 44, status: 4 }, {
      currentUserId: 9,
      tenantId: 2,
      areaId: 3,
    })).rejects.toBeInstanceOf(BusinessException)
    expect(update).not.toHaveBeenCalled()
  })

  it('rejects dispensing prescriptions before review approval', async () => {
    const update = jest.fn()
    const stockOut = jest.fn()
    const service = createPrescriptionService({
      rxRepository: {
        update,
      },
      pharmacyService: {
        stockOut,
      },
    })
    service.getDetail = jest.fn(async () => ({
      id: 8,
      status: 2,
      details: [{ id: 1, itemKind: 1, drugId: 10, quantity: 1 }],
    }))

    await expect(service.dispenseRx(8, {}, { tenantId: 2, areaId: 3 })).rejects.toBeInstanceOf(BusinessException)
    expect(stockOut).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })
})
