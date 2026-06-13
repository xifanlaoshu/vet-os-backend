import { BusinessException } from '~/common/exceptions/biz.exception'

import { AppointmentService } from './appointment.service'

function createAppointmentService(overrides: {
  appointmentRepository?: any
  doctorRepository?: any
  shiftRepository?: any
  staffScheduleRepository?: any
  petRepository?: any
  userRepository?: any
  visitService?: any
} = {}) {
  return new AppointmentService(
    overrides.appointmentRepository ?? {} as any,
    overrides.doctorRepository ?? {} as any,
    overrides.shiftRepository ?? {} as any,
    overrides.staffScheduleRepository ?? {} as any,
    overrides.petRepository ?? {} as any,
    overrides.userRepository ?? {} as any,
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
})
