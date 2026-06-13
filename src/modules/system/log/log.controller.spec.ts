import { ForbiddenException } from '@nestjs/common'

import { LogController } from './log.controller'

function createController() {
  const loginLogService = {
    list: jest.fn(async () => ({ items: [{ id: 1 }], meta: {} })),
  }
  const taskService = {
    list: jest.fn(async () => ({ items: [{ id: 2 }], meta: {} })),
  }
  const captchaLogService = {
    paginate: jest.fn(async () => ({ items: [{ id: 3 }], meta: {} })),
  }

  return {
    controller: new LogController(loginLogService as any, taskService as any, captchaLogService as any),
    loginLogService,
    taskService,
    captchaLogService,
  }
}

const platformUser = { uid: 1, platformAdmin: true } as any
const tenantUser = { uid: 7, platformAdmin: false } as any

describe('logController platform boundaries', () => {
  it('rejects login, task, and captcha log access for non-platform administrators', async () => {
    const { controller, loginLogService, taskService, captchaLogService } = createController()

    await expect(controller.loginLogPage({} as any, tenantUser)).rejects.toBeInstanceOf(ForbiddenException)
    await expect(controller.taskList({} as any, tenantUser)).rejects.toBeInstanceOf(ForbiddenException)
    await expect(controller.captchaList({} as any, tenantUser)).rejects.toBeInstanceOf(ForbiddenException)
    expect(loginLogService.list).not.toHaveBeenCalled()
    expect(taskService.list).not.toHaveBeenCalled()
    expect(captchaLogService.paginate).not.toHaveBeenCalled()
  })

  it('allows platform administrators to inspect system logs', async () => {
    const { controller, loginLogService, taskService, captchaLogService } = createController()

    await expect(controller.loginLogPage({} as any, platformUser)).resolves.toEqual({ items: [{ id: 1 }], meta: {} })
    await expect(controller.taskList({} as any, platformUser)).resolves.toEqual({ items: [{ id: 2 }], meta: {} })
    await expect(controller.captchaList({} as any, platformUser)).resolves.toEqual({ items: [{ id: 3 }], meta: {} })
    expect(loginLogService.list).toHaveBeenCalledWith({})
    expect(taskService.list).toHaveBeenCalledWith({})
    expect(captchaLogService.paginate).toHaveBeenCalledWith({})
  })
})
