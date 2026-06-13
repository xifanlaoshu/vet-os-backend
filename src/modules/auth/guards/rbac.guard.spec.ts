import { RbacGuard } from './rbac.guard'

function createExecutionContext(user: any, permission: string | null = 'system:role:list'): any {
  const handler = jest.fn()
  const clazz = jest.fn()
  const request = {
    method: 'GET',
    url: '/api/system/role',
    user,
  }
  return {
    getHandler: () => handler,
    getClass: () => clazz,
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    permission,
  }
}

function createGuard(overrides: { authService?: any, permission?: string | null } = {}) {
  const authService = {
    getPermissionsCache: jest.fn(async () => null),
    getPermissions: jest.fn(async () => ['system:role:list']),
    setPermissionsCache: jest.fn(),
    ...overrides.authService,
  }
  const reflector = {
    getAllAndOverride: jest.fn((key: string) => {
      if (key.includes('public') || key.includes('allow'))
        return false
      return overrides.permission ?? 'system:role:list'
    }),
  }
  return {
    guard: new RbacGuard(reflector as any, authService),
    authService,
  }
}

describe('rbacGuard tenant permission boundaries', () => {
  it('allows platform administrators by explicit platformAdmin context', async () => {
    const { guard, authService } = createGuard()

    await expect(guard.canActivate(createExecutionContext({
      uid: 1,
      roles: [],
      platformAdmin: true,
      tenantId: 2,
    }))).resolves.toBe(true)

    expect(authService.getPermissions).not.toHaveBeenCalled()
  })

  it('loads permissions using the full token context when cache is missing', async () => {
    const { guard, authService } = createGuard()
    const user = {
      uid: 7,
      roles: ['doctor'],
      platformAdmin: false,
      tenantId: 2,
    }

    await expect(guard.canActivate(createExecutionContext(user))).resolves.toBe(true)

    expect(authService.getPermissions).toHaveBeenCalledWith(user)
    expect(authService.setPermissionsCache).toHaveBeenCalledWith(7, ['system:role:list'])
  })
})
