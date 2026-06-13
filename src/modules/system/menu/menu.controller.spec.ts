import { ForbiddenException } from '@nestjs/common'

import { MenuController } from './menu.controller'

function createController() {
  const menuService = {
    list: jest.fn(async () => [{ id: 1, name: 'System' }]),
    getMenuItemAndParentInfo: jest.fn(async () => ({ id: 1, name: 'System' })),
    check: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    checkRoleByMenuId: jest.fn(async () => false),
    findChildMenus: jest.fn(async () => [2, 3]),
    deleteMenuItem: jest.fn(),
    refreshOnlineUserPerms: jest.fn(),
  }

  return {
    controller: new MenuController(menuService as any),
    menuService,
  }
}

const platformUser = { uid: 1, platformAdmin: true } as any
const tenantUser = { uid: 7, platformAdmin: false } as any

describe('menuController platform boundaries', () => {
  it('keeps menu reads available for tenant role permission assignment', async () => {
    const { controller, menuService } = createController()

    await expect(controller.list({} as any)).resolves.toEqual([{ id: 1, name: 'System' }])
    expect(menuService.list).toHaveBeenCalledWith({})
  })

  it('rejects menu creation for non-platform administrators', async () => {
    const { controller, menuService } = createController()

    await expect(controller.create({ type: 1, parentId: null } as any, tenantUser))
      .rejects
      .toBeInstanceOf(ForbiddenException)
    expect(menuService.check).not.toHaveBeenCalled()
    expect(menuService.create).not.toHaveBeenCalled()
  })

  it('allows platform administrators to create global menus', async () => {
    const { controller, menuService } = createController()
    const dto = { type: 1, parentId: undefined } as any

    await expect(controller.create(dto, platformUser)).resolves.toBeUndefined()
    expect(dto.parentId).toBeNull()
    expect(menuService.check).toHaveBeenCalledWith(dto)
    expect(menuService.create).toHaveBeenCalledWith(dto)
  })

  it('rejects menu updates and deletions for non-platform administrators', async () => {
    const { controller, menuService } = createController()

    await expect(controller.update(1, { type: 1 } as any, tenantUser))
      .rejects
      .toBeInstanceOf(ForbiddenException)
    await expect(controller.delete(1, tenantUser))
      .rejects
      .toBeInstanceOf(ForbiddenException)
    expect(menuService.update).not.toHaveBeenCalled()
    expect(menuService.deleteMenuItem).not.toHaveBeenCalled()
  })

  it('allows platform administrators to delete global menus and child menus', async () => {
    const { controller, menuService } = createController()

    await expect(controller.delete(1, platformUser)).resolves.toBeUndefined()
    expect(menuService.checkRoleByMenuId).toHaveBeenCalledWith(1)
    expect(menuService.findChildMenus).toHaveBeenCalledWith(1)
    expect(menuService.deleteMenuItem).toHaveBeenCalledWith([1, 2, 3])
    expect(menuService.refreshOnlineUserPerms).toHaveBeenCalled()
  })

  it('rejects backend-defined permission enumeration for non-platform administrators', async () => {
    const { controller } = createController()

    await expect(controller.getPermissions(tenantUser))
      .rejects
      .toBeInstanceOf(ForbiddenException)
  })

  it('allows platform administrators to enumerate backend-defined permissions', async () => {
    const { controller } = createController()

    await expect(controller.getPermissions(platformUser)).resolves.toContain('system:menu:list')
  })
})
