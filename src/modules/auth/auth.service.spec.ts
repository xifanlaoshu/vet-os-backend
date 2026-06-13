import { AuthService } from './auth.service'

function createService(overrides: {
  redis?: any
  menuService?: any
  roleService?: any
  tenantService?: any
  tokenService?: any
} = {}) {
  const redis = {
    set: jest.fn(),
    ...overrides.redis,
  }
  const menuService = {
    getPermissions: jest.fn(async () => ['system:role:list']),
    ...overrides.menuService,
  }
  const roleService = {
    getRoleIdsByUser: jest.fn(async () => [21]),
    getRoleValues: jest.fn(async () => ['tenantAdmin']),
    ...overrides.roleService,
  }
  const tenantService = {
    assertUserArea: jest.fn(async () => [{
      tenantId: 2,
      tenantName: 'Tenant A',
      areaId: 3,
      areaName: 'Area A',
    }]),
    ...overrides.tenantService,
  }
  const tokenService = {
    generateAccessToken: jest.fn(async () => ({
      accessToken: 'tenant-token',
      refreshToken: 'refresh-token',
    })),
    rotateRefreshToken: jest.fn(async () => ({
      uid: 7,
      accessToken: 'rotated-access-token',
      refreshToken: 'rotated-refresh-token',
      previousAccessToken: 'previous-access-token',
      previousAccessTokenExpiresAt: new Date(Date.now() + 60_000),
    })),
    ...overrides.tokenService,
  }

  return {
    service: new AuthService(
      redis,
      menuService,
      roleService,
      tenantService,
      {} as any,
      {} as any,
      tokenService,
      { jwtExprire: 3600 } as any,
      { multiDeviceLogin: false } as any,
    ),
    redis,
    menuService,
    roleService,
    tenantService,
    tokenService,
  }
}

describe('authService tenant permission boundaries', () => {
  it('rebuilds token roles and permission cache from the selected tenant context', async () => {
    const { service, redis, menuService, roleService, tokenService } = createService()

    await expect(service.selectContext({
      uid: 7,
      accountId: 7,
      platformAdmin: false,
    } as any, 2, 3)).resolves.toEqual(expect.objectContaining({
      token: 'tenant-token',
      tenantId: 2,
      areaId: 3,
      contextSelected: true,
    }))

    expect(roleService.getRoleIdsByUser).toHaveBeenCalledWith(7, 2)
    expect(roleService.getRoleValues).toHaveBeenCalledWith([21], 2)
    expect(tokenService.generateAccessToken).toHaveBeenCalledWith(7, ['tenantAdmin'], expect.objectContaining({
      tenantId: 2,
      areaId: 3,
      contextSelected: true,
    }))
    expect(menuService.getPermissions).toHaveBeenCalledWith(7, {
      tenantId: 2,
      platformAdmin: false,
    })
    expect(redis.set).toHaveBeenCalledWith('auth:permission:7', JSON.stringify(['system:role:list']))
  })

  it('keeps platform-admin role resolution global while preserving platformAdmin context', async () => {
    const { service, roleService, menuService } = createService()

    await service.selectContext({
      uid: 1,
      accountId: 1,
      platformAdmin: true,
    } as any, 2, 3)

    expect(roleService.getRoleIdsByUser).toHaveBeenCalledWith(1, undefined)
    expect(roleService.getRoleValues).toHaveBeenCalledWith([21], undefined)
    expect(menuService.getPermissions).toHaveBeenCalledWith(1, {
      tenantId: 2,
      platformAdmin: true,
    })
  })

  it('blacklists the previous access token and refreshes the current-token cache when rotating refresh tokens', async () => {
    const { service, redis, tokenService } = createService()

    await expect(service.refreshLoginToken('refresh-token')).resolves.toEqual(expect.objectContaining({
      accessToken: 'rotated-access-token',
      refreshToken: 'rotated-refresh-token',
    }))

    expect(tokenService.rotateRefreshToken).toHaveBeenCalledWith('refresh-token')
    expect(redis.set).toHaveBeenCalledWith(
      'token:blacklist:previous-access-token',
      'previous-access-token',
      'EX',
      expect.any(Number),
    )
    expect(redis.set).toHaveBeenCalledWith(
      'auth:token:7',
      'rotated-access-token',
      'EX',
      3600,
    )
  })
})
