import { BusinessException } from '~/common/exceptions/biz.exception'

import { ReminderService } from './reminder.service'

function createReminderService(overrides: {
  reminderRepository?: any
  customerRepository?: any
  petRepository?: any
  visitRepository?: any
} = {}) {
  return new ReminderService(
    overrides.reminderRepository ?? {} as any,
    overrides.customerRepository ?? {} as any,
    overrides.petRepository ?? {} as any,
    overrides.visitRepository ?? {} as any,
  ) as any
}

describe('reminderService visit consistency boundaries', () => {
  it('rejects reminders when the selected customer differs from the linked visit customer', async () => {
    const service = createReminderService({
      customerRepository: {
        findOneBy: jest.fn(async () => ({ id: 99, name: 'Other Customer' })),
      },
      petRepository: {
        findOneBy: jest.fn(async () => ({ id: 6, customerId: 99 })),
      },
      visitRepository: {
        findOneBy: jest.fn(async () => ({ id: 8, customerId: 5, petId: 6 })),
      },
    })

    await expect(service.create({
      visitId: 8,
      customerId: 99,
      petId: 6,
      type: 1,
      reminderName: 'Review',
      dueDate: '2026-06-20',
    }, { tenantId: 2, areaId: 3 })).rejects.toBeInstanceOf(BusinessException)
  })

  it('rejects reminders when the selected pet differs from the linked visit pet', async () => {
    const service = createReminderService({
      customerRepository: {
        findOneBy: jest.fn(async () => ({ id: 5, name: 'Visit Customer' })),
      },
      petRepository: {
        findOneBy: jest.fn(async () => ({ id: 66, customerId: 5 })),
      },
      visitRepository: {
        findOneBy: jest.fn(async () => ({ id: 8, customerId: 5, petId: 6 })),
      },
    })

    await expect(service.create({
      visitId: 8,
      customerId: 5,
      petId: 66,
      type: 1,
      reminderName: 'Review',
      dueDate: '2026-06-20',
    }, { tenantId: 2, areaId: 3 })).rejects.toBeInstanceOf(BusinessException)
  })
})

describe('reminderService workflow state boundaries', () => {
  it('rejects completing reminders that are already canceled', async () => {
    const update = jest.fn()
    const service = createReminderService({
      reminderRepository: {
        findOneBy: jest.fn(async () => ({ id: 8, status: 4 })),
        update,
      },
    })

    await expect(service.complete(8, { tenantId: 2, areaId: 3 })).rejects.toBeInstanceOf(BusinessException)
    expect(update).not.toHaveBeenCalled()
  })

  it('rejects canceling reminders that are already completed', async () => {
    const update = jest.fn()
    const service = createReminderService({
      reminderRepository: {
        findOneBy: jest.fn(async () => ({ id: 8, status: 3 })),
        update,
      },
    })

    await expect(service.cancel(8, { tenantId: 2, areaId: 3 })).rejects.toBeInstanceOf(BusinessException)
    expect(update).not.toHaveBeenCalled()
  })

  it('keeps cancel idempotent for already canceled reminders', async () => {
    const update = jest.fn()
    const service = createReminderService({
      reminderRepository: {
        findOneBy: jest.fn(async () => ({ id: 8, status: 4 })),
        update,
      },
    })

    await expect(service.cancel(8, { tenantId: 2, areaId: 3 })).resolves.toEqual({ id: 8, status: 4 })
    expect(update).not.toHaveBeenCalled()
  })
})
