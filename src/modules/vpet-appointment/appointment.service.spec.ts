import { BusinessException } from '~/common/exceptions/biz.exception'

import { AppointmentService } from './appointment.service'

function createAppointmentService(overrides: {
  appointmentRepository?: any
  doctorRepository?: any
  shiftRepository?: any
  staffScheduleRepository?: any
  petRepository?: any
  userRepository?: any
  userAreaRepository?: any
  visitService?: any
} = {}) {
  return new AppointmentService(
    overrides.appointmentRepository ?? {} as any,
    overrides.doctorRepository ?? {} as any,
    overrides.shiftRepository ?? {} as any,
    overrides.staffScheduleRepository ?? {} as any,
    overrides.petRepository ?? {} as any,
    overrides.userRepository ?? {} as any,
    overrides.userAreaRepository ?? {} as any,
    overrides.visitService ?? {} as any,
  ) as any
}

describe('appointmentService state transition boundaries', () => {
  it('rejects direct status changes through the generic update endpoint', async () => {
    const update = jest.fn()
    const service = createAppointmentService({
      appointmentRepository: {
        findOneBy: jest.fn(async () => ({ id: 9, status: 1 })),
        update,
      },
    })

    await expect(service.update(9, { status: 4 }, { tenantId: 2, areaId: 3 })).rejects.toBeInstanceOf(BusinessException)
    expect(update).not.toHaveBeenCalled()
  })

  it('rejects core scheduling changes after check-in', async () => {
    const update = jest.fn()
    const service = createAppointmentService({
      appointmentRepository: {
        findOneBy: jest.fn(async () => ({ id: 9, status: 2, customerId: 5, petId: 6, doctorId: 7, appointmentTime: '2026-06-13 10:00:00' })),
        update,
      },
    })

    await expect(service.update(9, {
      doctorId: 8,
      appointmentTime: '2026-06-13 10:30:00',
    }, { tenantId: 2, areaId: 3 })).rejects.toBeInstanceOf(BusinessException)
    expect(update).not.toHaveBeenCalled()
  })

  it('rejects cancel when the appointment is already checked in', async () => {
    const update = jest.fn()
    const service = createAppointmentService({
      appointmentRepository: {
        findOneBy: jest.fn(async () => ({ id: 9, status: 2 })),
        update,
      },
      visitService: {
        findByAppointmentId: jest.fn(async () => null),
      },
    })

    await expect(service.cancel(9, { tenantId: 2, areaId: 3 })).rejects.toBeInstanceOf(BusinessException)
    expect(update).not.toHaveBeenCalled()
  })

  it('rejects cancel when the appointment has generated a visit', async () => {
    const update = jest.fn()
    const service = createAppointmentService({
      appointmentRepository: {
        findOneBy: jest.fn(async () => ({ id: 9, status: 1 })),
        update,
      },
      visitService: {
        findByAppointmentId: jest.fn(async () => ({ id: 18, appointmentId: 9 })),
      },
    })

    await expect(service.cancel(9, { tenantId: 2, areaId: 3 })).rejects.toBeInstanceOf(BusinessException)
    expect(update).not.toHaveBeenCalled()
  })

  it('keeps cancel idempotent for an already canceled appointment', async () => {
    const update = jest.fn()
    const findByAppointmentId = jest.fn()
    const service = createAppointmentService({
      appointmentRepository: {
        findOneBy: jest.fn(async () => ({ id: 9, status: 4 })),
        update,
      },
      visitService: {
        findByAppointmentId,
      },
    })

    await service.cancel(9, { tenantId: 2, areaId: 3 })

    expect(findByAppointmentId).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('rejects cancel instead of silently updating when the appointment is outside the current area', async () => {
    const update = jest.fn()
    const service = createAppointmentService({
      appointmentRepository: {
        findOneBy: jest.fn(async () => null),
        update,
      },
      visitService: {
        findByAppointmentId: jest.fn(async () => null),
      },
    })

    await expect(service.cancel(9, { tenantId: 2, areaId: 3 })).rejects.toBeInstanceOf(BusinessException)
    expect(update).not.toHaveBeenCalled()
  })

  it('rejects generic updates when the appointment is outside the current area', async () => {
    const update = jest.fn()
    const service = createAppointmentService({
      appointmentRepository: {
        findOneBy: jest.fn(async () => null),
        update,
      },
    })

    await expect(service.update(9, { remark: 'changed' }, { tenantId: 2, areaId: 3 })).rejects.toBeInstanceOf(BusinessException)
    expect(update).not.toHaveBeenCalled()
  })

  it('rejects binding medical staff to users outside the current tenant', async () => {
    const save = jest.fn()
    const service = createAppointmentService({
      doctorRepository: {
        create: jest.fn((value: any) => value),
        save,
      },
      userRepository: {
        findOneBy: jest.fn(async () => ({ id: 88, tenantId: 99, status: 1 })),
      },
      userAreaRepository: {
        findOneBy: jest.fn(async () => null),
      },
    })

    await expect(service.createDoctor({ name: 'Dr. Cross', userId: 88 } as any, { tenantId: 2 })).rejects.toBeInstanceOf(BusinessException)
    expect(save).not.toHaveBeenCalled()
  })

  it('allows binding medical staff to users granted to the current tenant', async () => {
    const save = jest.fn(async (value: any) => value)
    const service = createAppointmentService({
      doctorRepository: {
        create: jest.fn((value: any) => value),
        save,
      },
      userRepository: {
        findOneBy: jest.fn(async () => ({ id: 88, tenantId: 99, status: 1 })),
      },
      userAreaRepository: {
        findOneBy: jest.fn(async () => ({ id: 1, userId: 88, tenantId: 2, areaId: 3 })),
      },
    })

    await expect(service.createDoctor({ name: 'Dr. Grant', userId: 88 } as any, { tenantId: 2 })).resolves.toMatchObject({ tenantId: 2 })
    expect(save).toHaveBeenCalled()
  })

  it('rejects updating medical staff outside the current tenant', async () => {
    const update = jest.fn()
    const service = createAppointmentService({
      doctorRepository: {
        findOneBy: jest.fn(async () => null),
        update,
      },
    })

    await expect(service.updateDoctor(9, { name: 'Changed' } as any, { tenantId: 2 })).rejects.toBeInstanceOf(BusinessException)
    expect(update).not.toHaveBeenCalled()
  })

  it('rejects deleting medical staff outside the current tenant', async () => {
    const remove = jest.fn()
    const service = createAppointmentService({
      doctorRepository: {
        findOneBy: jest.fn(async () => null),
        delete: remove,
      },
    })

    await expect(service.deleteDoctor(9, { tenantId: 2 })).rejects.toBeInstanceOf(BusinessException)
    expect(remove).not.toHaveBeenCalled()
  })

  it('rejects deleting shifts outside the current tenant', async () => {
    const remove = jest.fn()
    const service = createAppointmentService({
      shiftRepository: {
        findOneBy: jest.fn(async () => null),
        delete: remove,
      },
      staffScheduleRepository: {
        count: jest.fn(async () => 0),
      },
    })

    await expect(service.deleteShift(9, { tenantId: 2 })).rejects.toBeInstanceOf(BusinessException)
    expect(remove).not.toHaveBeenCalled()
  })
})
