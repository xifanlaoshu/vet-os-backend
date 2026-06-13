import { ForbiddenException } from '@nestjs/common'

import { TaskController } from './task.controller'

function createController() {
  const task = { id: 1, service: 'logClear.run', data: '{}', status: 1 }
  const taskService = {
    list: jest.fn(async () => ({ items: [task], meta: {} })),
    info: jest.fn(async () => task),
    checkHasMissionMeta: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    once: jest.fn(),
    stop: jest.fn(),
    start: jest.fn(),
  }

  return {
    controller: new TaskController(taskService as any),
    taskService,
    task,
  }
}

const platformUser = { uid: 1, platformAdmin: true } as any
const tenantUser = { uid: 7, platformAdmin: false } as any

describe('taskController platform boundaries', () => {
  it('rejects task list access for non-platform administrators', async () => {
    const { controller, taskService } = createController()

    await expect(controller.list({} as any, tenantUser))
      .rejects
      .toBeInstanceOf(ForbiddenException)
    expect(taskService.list).not.toHaveBeenCalled()
  })

  it('allows platform administrators to list global tasks', async () => {
    const { controller, taskService } = createController()

    await expect(controller.list({} as any, platformUser)).resolves.toEqual({ items: [expect.any(Object)], meta: {} })
    expect(taskService.list).toHaveBeenCalledWith({})
  })

  it('rejects task creation and update for non-platform administrators before mission validation', async () => {
    const { controller, taskService } = createController()

    await expect(controller.create({ service: 'logClear.run' } as any, tenantUser))
      .rejects
      .toBeInstanceOf(ForbiddenException)
    await expect(controller.update(1, { service: 'logClear.run' } as any, tenantUser))
      .rejects
      .toBeInstanceOf(ForbiddenException)
    expect(taskService.checkHasMissionMeta).not.toHaveBeenCalled()
    expect(taskService.create).not.toHaveBeenCalled()
    expect(taskService.update).not.toHaveBeenCalled()
  })

  it('allows platform administrators to create global tasks after mission validation', async () => {
    const { controller, taskService } = createController()
    const dto = { service: 'logClear.run' } as any

    await expect(controller.create(dto, platformUser)).resolves.toBeUndefined()
    expect(taskService.checkHasMissionMeta).toHaveBeenCalledWith('logClear', 'run')
    expect(taskService.create).toHaveBeenCalledWith(dto)
  })

  it('rejects task execution controls for non-platform administrators', async () => {
    const { controller, taskService } = createController()

    await expect(controller.once(1, tenantUser)).rejects.toBeInstanceOf(ForbiddenException)
    await expect(controller.stop(1, tenantUser)).rejects.toBeInstanceOf(ForbiddenException)
    await expect(controller.start(1, tenantUser)).rejects.toBeInstanceOf(ForbiddenException)
    expect(taskService.info).not.toHaveBeenCalled()
    expect(taskService.once).not.toHaveBeenCalled()
    expect(taskService.stop).not.toHaveBeenCalled()
    expect(taskService.start).not.toHaveBeenCalled()
  })

  it('allows platform administrators to execute task controls', async () => {
    const { controller, taskService, task } = createController()

    await expect(controller.once(1, platformUser)).resolves.toBeUndefined()
    await expect(controller.stop(1, platformUser)).resolves.toBeUndefined()
    await expect(controller.start(1, platformUser)).resolves.toBeUndefined()
    expect(taskService.info).toHaveBeenCalledTimes(3)
    expect(taskService.once).toHaveBeenCalledWith(task)
    expect(taskService.stop).toHaveBeenCalledWith(task)
    expect(taskService.start).toHaveBeenCalledWith(task)
  })

  it('rejects task deletion for non-platform administrators', async () => {
    const { controller, taskService } = createController()

    await expect(controller.delete(1, tenantUser))
      .rejects
      .toBeInstanceOf(ForbiddenException)
    expect(taskService.delete).not.toHaveBeenCalled()
  })
})
