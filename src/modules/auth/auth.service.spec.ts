import { hashPassword } from '~/utils'
import { AuthService } from './auth.service'

function createService(overrides: {
  redis?: any
  menuService?: any
  roleService?: any
  tenantService?: any
  userService?: any
  loginLogService?: any
  mfaService?: any
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
  const userService = {
    findUserByUserName: jest.fn(),
    setPasswordHash: jest.fn(),
    ...overrides.userService,
  }
  const mfaService = {
    assertLoginAllowed: jest.fn(),
    ...overrides.mfaService,
  }
  const loginLogService = {
    create: jest.fn(),
    ...overrides.loginLogService,
  }

  return {
    service: new AuthService(
      redis,
      menuService,
      roleService,
      tenantService,
      userService,
      loginLogService,
      mfaService,
      tokenService,
      { jwtExprire: 3600 } as any,
      { multiDeviceLogin: false } as any,
    ),
    redis,
    menuService,
    roleService,
    tenantService,
    userService,
    loginLogService,
    mfaService,
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

  it('requires enabled MFA users to pass MFA verification during login', async () => {
    const password = 'StrongPassword123'
    const salt = '0123456789abcdef0123456789abcdef'
    const passwordHash = await hashPassword(password, salt)
    const { service, mfaService, userService } = createService({
      userService: {
        findUserByUserName: jest.fn(async () => ({
          id: 7,
          username: 'doctor',
          password: passwordHash,
          psalt: salt,
          mfaEnabled: true,
          mfaSecret: 'encrypted-mfa-secret',
        })),
      },
    })

    await expect(service.login('doctor', password, '127.0.0.1', 'jest', '123456')).resolves.toEqual({
      token: 'tenant-token',
      refreshToken: 'refresh-token',
    })

    expect(mfaService.assertLoginAllowed).toHaveBeenCalledWith(expect.objectContaining({
      id: 7,
      mfaEnabled: true,
      mfaSecret: 'encrypted-mfa-secret',
    }), '123456')
    expect(userService.findUserByUserName).toHaveBeenCalledWith('doctor')
  })
})
