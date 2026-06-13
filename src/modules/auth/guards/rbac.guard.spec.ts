import { BusinessException } from '~/common/exceptions/biz.exception'

import { RbacGuard } from './rbac.guard'

function createExecutionContext(
  user: any,
  permission: string | null = 'system:role:list',
  requestOverrides: Record<string, any> = {},
): any {
  const handler = jest.fn()
  const clazz = jest.fn()
  const request = {
    method: 'GET',
    url: '/api/system/role',
    user,
    ...requestOverrides,
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

function createGuardWithAccessMetadata({
  isPublic = false,
  allowAnon = false,
  permission = 'system:role:list',
  authService,
}: {
  isPublic?: boolean
  allowAnon?: boolean
  permission?: string | null
  authService?: any
} = {}) {
  const service = {
    getPermissionsCache: jest.fn(async () => null),
    getPermissions: jest.fn(async () => ['system:role:list']),
    setPermissionsCache: jest.fn(),
    ...authService,
  }
  const reflector = {
    getAllAndOverride: jest.fn((key: string) => {
      if (key.includes('public'))
        return isPublic
      if (key.includes('allow'))
        return allowAnon
      return permission
    }),
  }
  return {
    guard: new RbacGuard(reflector as any, service),
    authService: service,
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

  it('does not bypass permissions for tenant users with an admin role value', async () => {
    const { guard } = createGuard({
      authService: {
        getPermissionsCache: jest.fn(async () => null),
        getPermissions: jest.fn(async () => []),
        setPermissionsCache: jest.fn(),
      },
    })

    await expect(guard.canActivate(createExecutionContext({
      uid: 7,
      roles: ['admin'],
      platformAdmin: false,
      tenantId: 2,
    }))).rejects.toBeInstanceOf(BusinessException)
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

  it('does not bypass permissions for server monitoring routes', async () => {
    const { guard } = createGuard({
      permission: 'system:serve:stat',
      authService: {
        getPermissions: jest.fn(async () => ['system:role:list']),
      },
    })

    await expect(guard.canActivate(createExecutionContext({
      uid: 7,
      roles: ['doctor'],
      platformAdmin: false,
      tenantId: 2,
    }, 'system:serve:stat', {
      url: '/api/system/serve/stat',
    }))).rejects.toBeInstanceOf(BusinessException)
  })

  it('allows routes only when AllowAnon metadata is explicit', async () => {
    const { guard, authService } = createGuardWithAccessMetadata({
      allowAnon: true,
      permission: null,
    })

    await expect(guard.canActivate(createExecutionContext({
      uid: 7,
      roles: ['doctor'],
      platformAdmin: false,
      tenantId: 2,
    }, null, {
      url: '/api/system/dict-type',
    }))).resolves.toBe(true)
    expect(authService.getPermissions).not.toHaveBeenCalled()
  })

  it('does not bypass missing metadata based on dictionary route paths', async () => {
    const { guard } = createGuardWithAccessMetadata({
      allowAnon: false,
      permission: null,
    })

    await expect(guard.canActivate(createExecutionContext({
      uid: 7,
      roles: ['doctor'],
      platformAdmin: false,
      tenantId: 2,
    }, null, {
      url: '/api/system/dict-type',
    }))).rejects.toBeInstanceOf(BusinessException)
  })
})
