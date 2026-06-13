import { MenuService } from './menu.service'

function createService(overrides: {
  menuRepository?: any
  roleService?: any
} = {}) {
  const redis = {
    get: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(async () => []),
  }
  const menuRepository = {
    find: jest.fn(async () => [{ id: 1, path: '/system', name: 'System', permission: 'system:menu:list', type: 1 }]),
    createQueryBuilder: jest.fn(),
    ...overrides.menuRepository,
  }
  const roleService = {
    getRoleIdsByUser: jest.fn(async () => [1]),
    ...overrides.roleService,
  }
  const sseService = {
    noticeClientToUpdateMenusByMenuIds: jest.fn(),
    noticeClientToUpdateMenusByUserIds: jest.fn(),
  }

  return {
    service: new MenuService(redis as any, menuRepository as any, roleService as any, sseService as any),
    menuRepository,
    roleService,
  }
}

function createTenantRoleMenuQueryBuilder(rows: any[] = []) {
  const qb = {
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(async () => rows),
  }
  return qb
}

describe('menuService platform menu boundaries', () => {
  it('does not grant global menus to non-platform users only because they have the root role id', async () => {
    const qb = createTenantRoleMenuQueryBuilder([])
    const { service, menuRepository } = createService({
      menuRepository: {
        find: jest.fn(async () => [{ id: 1, path: '/system', name: 'System' }]),
        createQueryBuilder: jest.fn(() => qb),
      },
    })

    await service.getMenus(7, { tenantId: 2, platformAdmin: false })

    expect(menuRepository.find).not.toHaveBeenCalled()
    expect(menuRepository.createQueryBuilder).toHaveBeenCalledWith('menu')
  })

  it('does not grant global permissions to non-platform users only because they have the root role id', async () => {
    const qb = createTenantRoleMenuQueryBuilder([])
    const { service, menuRepository } = createService({
      menuRepository: {
        findBy: jest.fn(async () => [{ permission: 'system:tenant:list', type: 1 }]),
        createQueryBuilder: jest.fn(() => qb),
      },
    })

    await expect(service.getPermissions(7, { tenantId: 2, platformAdmin: false })).resolves.toEqual([])

    expect(menuRepository.findBy).not.toHaveBeenCalled()
    expect(menuRepository.createQueryBuilder).toHaveBeenCalledWith('menu')
  })
})
