import { BusinessException } from '~/common/exceptions/biz.exception'

import { PrescriptionService } from './prescription.service'

function createPrescriptionService(overrides: {
  doctorRepository?: any
  rxRepository?: any
  templateRepository?: any
  templateItemRepository?: any
  drugRepository?: any
  chargeItemRepository?: any
  pharmacyService?: any
} = {}) {
  return new PrescriptionService(
    overrides.rxRepository ?? {} as any,
    {} as any,
    overrides.templateRepository ?? {} as any,
    overrides.templateItemRepository ?? {} as any,
    {} as any,
    overrides.drugRepository ?? {} as any,
    overrides.chargeItemRepository ?? {} as any,
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

  it('rejects dispensing prescriptions that are outside the current area', async () => {
    const service = createPrescriptionService()
    service.getDetail = jest.fn(async () => null)

    await expect(service.dispenseRx(8, {}, { tenantId: 2, areaId: 3 })).rejects.toBeInstanceOf(BusinessException)
  })
})

describe('prescriptionService template tenant boundaries', () => {
  it('rejects deleting prescription templates outside the current tenant', async () => {
    const deleteTemplateItems = jest.fn()
    const deleteTemplate = jest.fn()
    const service = createPrescriptionService({
      templateRepository: {
        findOneBy: jest.fn(async () => null),
        delete: deleteTemplate,
      },
      templateItemRepository: {
        delete: deleteTemplateItems,
      },
    })

    await expect(service.deleteTemplate(8, { tenantId: 2 })).rejects.toBeInstanceOf(BusinessException)
    expect(deleteTemplateItems).not.toHaveBeenCalled()
    expect(deleteTemplate).not.toHaveBeenCalled()
  })

  it('deletes prescription template items and template only after tenant-scoped lookup succeeds', async () => {
    const deleteTemplateItems = jest.fn(async () => ({ affected: 2 }))
    const deleteTemplate = jest.fn(async () => ({ affected: 1 }))
    const service = createPrescriptionService({
      templateRepository: {
        findOneBy: jest.fn(async () => ({ id: 8, tenantId: 2 })),
        delete: deleteTemplate,
      },
      templateItemRepository: {
        delete: deleteTemplateItems,
      },
    })

    await expect(service.deleteTemplate(8, { tenantId: 2 })).resolves.toBeUndefined()
    expect(deleteTemplateItems).toHaveBeenCalledWith({ templateId: 8, tenantId: 2 })
    expect(deleteTemplate).toHaveBeenCalledWith({ id: 8, tenantId: 2 })
  })

  it('rejects prescription template details referencing drugs outside the current tenant', async () => {
    const save = jest.fn()
    const service = createPrescriptionService({
      templateRepository: {
        create: jest.fn((entity: any) => entity),
        save,
      },
      templateItemRepository: {
        create: jest.fn((entity: any) => entity),
      },
      drugRepository: {
        findOneBy: jest.fn(async () => null),
      },
    })

    await expect(service.createTemplate({
      templateCode: 'TPL001',
      templateName: 'Cross tenant drug template',
      items: [{ itemKind: 1, drugId: 99, quantity: 1, unitPrice: 1 }],
    }, { tenantId: 2 })).rejects.toBeInstanceOf(BusinessException)
    expect(save).not.toHaveBeenCalled()
  })

  it('rejects prescription template details referencing charge items outside the current tenant', async () => {
    const save = jest.fn()
    const service = createPrescriptionService({
      templateRepository: {
        create: jest.fn((entity: any) => entity),
        save,
      },
      templateItemRepository: {
        create: jest.fn((entity: any) => entity),
      },
      chargeItemRepository: {
        findOneBy: jest.fn(async () => null),
      },
    })

    await expect(service.createTemplate({
      templateCode: 'TPL002',
      templateName: 'Cross tenant service template',
      items: [{ itemKind: 2, chargeItemId: 77, quantity: 1, unitPrice: 1 }],
    }, { tenantId: 2 })).rejects.toBeInstanceOf(BusinessException)
    expect(save).not.toHaveBeenCalled()
  })
})
