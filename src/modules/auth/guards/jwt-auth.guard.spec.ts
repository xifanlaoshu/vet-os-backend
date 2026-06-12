import { UnauthorizedException } from '@nestjs/common'

import { BusinessException } from '~/common/exceptions/biz.exception'
import { ErrorEnum } from '~/constants/error-code.constant'

import { JwtAuthGuard } from './jwt-auth.guard'

jest.mock('@nestjs/passport', () => ({
  AuthGuard: () => class {
    async canActivate(context: any) {
      const request = context.switchToHttp().getRequest()
      request.user = request.user ?? {
        uid: 7,
        accountId: 7,
        pv: 3,
        roles: ['doctor'],
        platformAdmin: false,
      }
      return true
    }
  },
}))

jest.mock('~/utils', () => ({
  checkIsDemoMode: jest.fn(),
}))

function createExecutionContext(request: any): any {
  const handler = jest.fn()
  const clazz = jest.fn()
  return {
    getHandler: () => handler,
    getClass: () => clazz,
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  }
}

function createGuard(overrides: {
  reflector?: any
  authService?: any
  tokenService?: any
  tenantService?: any
  redis?: any
  appConfig?: any
} = {}) {
  const authService = {
    getPasswordVersionByUid: jest.fn(async () => '3'),
    getTokenByUid: jest.fn(async () => 'access-token'),
    ...overrides.authService,
  }
  const tokenService = {
    checkAccessToken: jest.fn(async () => true),
    ...overrides.tokenService,
  }
  const tenantService = {
    resolveRequestContext: jest.fn(async user => ({
      accountId: user.accountId,
      uid: user.uid,
      roles: user.roles,
      platformAdmin: user.platformAdmin,
      tenantId: 2,
      tenantName: 'Test Tenant',
      areaId: 3,
      areaName: 'Test Area',
      accessibleAreaIds: [3],
      areaOptions: [],
    })),
    ...overrides.tenantService,
  }
  const redis = {
    get: jest.fn(async () => null),
    ...overrides.redis,
  }
  const appConfig = {
    multiDeviceLogin: false,
    ...overrides.appConfig,
  }
  const reflector = {
    getAllAndOverride: jest.fn(() => false),
    ...overrides.reflector,
  }

  return {
    guard: new JwtAuthGuard(reflector, authService, tokenService, tenantService, redis, appConfig),
    authService,
    tokenService,
    tenantService,
    redis,
  }
}

function createRequest(overrides: any = {}) {
  return {
    method: 'GET',
    url: '/api/vpet/customer',
    headers: {
      'authorization': 'Bearer access-token',
      'x-area-id': '3',
      ...overrides.headers,
    },
    params: {},
    routeOptions: {
      url: '/api/vpet/customer',
      ...overrides.routeOptions,
    },
    ...overrides,
  }
}

describe('jwtAuthGuard security boundaries', () => {
  it('rejects blacklisted access tokens before business context resolution', async () => {
    const { guard, redis, tenantService } = createGuard({
      redis: { get: jest.fn(async () => '1') },
    })

    await expect(guard.canActivate(createExecutionContext(createRequest())))
      .rejects
      .toBeInstanceOf(BusinessException)
    expect(redis.get).toHaveBeenCalledWith('token:blacklist:access-token')
    expect(tenantService.resolveRequestContext).not.toHaveBeenCalled()
  })

  it('rejects stale access tokens when single-device login is enforced', async () => {
    const { guard, authService } = createGuard({
      authService: {
        getPasswordVersionByUid: jest.fn(async () => '3'),
        getTokenByUid: jest.fn(async () => 'newer-token'),
      },
    })

    await expect(guard.canActivate(createExecutionContext(createRequest())))
      .rejects
      .toBeInstanceOf(BusinessException)
    expect(authService.getTokenByUid).toHaveBeenCalledWith(7)
  })

  it('rejects tokens after the user password version changes', async () => {
    const { guard, authService } = createGuard({
      authService: {
        getPasswordVersionByUid: jest.fn(async () => '4'),
        getTokenByUid: jest.fn(async () => 'access-token'),
      },
    })

    await expect(guard.canActivate(createExecutionContext(createRequest())))
      .rejects
      .toBeInstanceOf(BusinessException)
    expect(authService.getPasswordVersionByUid).toHaveBeenCalledWith(7)
  })

  it('rejects SSE requests whose route uid does not match the token user', async () => {
    const { guard } = createGuard()

    await expect(guard.canActivate(createExecutionContext(createRequest({
      headers: {
        authorization: 'Bearer access-token',
        accept: 'text/event-stream',
      },
      params: { uid: '8' },
    }))))
      .rejects
      .toBeInstanceOf(UnauthorizedException)
  })

  it('rejects unauthorized requested areas through tenant context resolution', async () => {
    const tenantError = new BusinessException(ErrorEnum.NO_PERMISSION)
    const { guard, tenantService } = createGuard({
      tenantService: {
        resolveRequestContext: jest.fn(async () => {
          throw tenantError
        }),
      },
    })

    await expect(guard.canActivate(createExecutionContext(createRequest({
      headers: {
        'authorization': 'Bearer access-token',
        'x-area-id': '99',
      },
    }))))
      .rejects
      .toBe(tenantError)
    expect(tenantService.resolveRequestContext).toHaveBeenCalledWith(
      expect.objectContaining({ uid: 7 }),
      '99',
    )
  })
})
