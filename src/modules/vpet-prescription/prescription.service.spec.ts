import { PrescriptionService } from './prescription.service'

function createPrescriptionService(overrides: { doctorRepository?: any, rxRepository?: any } = {}) {
  return new PrescriptionService(
    overrides.rxRepository ?? {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    overrides.doctorRepository ?? {} as any,
    {} as any,
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
