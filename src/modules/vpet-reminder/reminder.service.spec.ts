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
