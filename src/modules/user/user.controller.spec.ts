import { ForbiddenException } from '@nestjs/common'

import { UserController } from './user.controller'

function createController() {
  const userService = {
    list: jest.fn(async () => ({ items: [] })),
    info: jest.fn(async () => ({ id: 7 })),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    multiForbidden: jest.fn(),
    forceUpdatePassword: jest.fn(),
  }
  const menuService = {
    refreshPerms: jest.fn(),
  }
  const tenantService = {
    getUserAreaGrants: jest.fn(async () => []),
    saveUserAreaGrants: jest.fn(),
  }
  return {
    controller: new UserController(userService as any, menuService as any, tenantService as any),
    userService,
    tenantService,
  }
}

describe('userController platform boundaries', () => {
  it('rejects system user list access for non-platform administrators', async () => {
    const { controller, userService } = createController()

    await expect(controller.list({} as any, { uid: 7, platformAdmin: false } as any))
      .rejects
      .toBeInstanceOf(ForbiddenException)
    expect(userService.list).not.toHaveBeenCalled()
  })

  it('allows platform administrators to access system user management', async () => {
    const { controller, userService } = createController()

    await expect(controller.list({} as any, { uid: 1, platformAdmin: true } as any))
      .resolves
      .toEqual({ items: [] })
    expect(userService.list).toHaveBeenCalledWith({})
  })

  it('rejects tenant grant updates for non-platform administrators', async () => {
    const { controller, tenantService } = createController()

    await expect(controller.saveUserAreas(7, { items: [] } as any, { uid: 7, platformAdmin: false } as any))
      .rejects
      .toBeInstanceOf(ForbiddenException)
    expect(tenantService.saveUserAreaGrants).not.toHaveBeenCalled()
  })
})
