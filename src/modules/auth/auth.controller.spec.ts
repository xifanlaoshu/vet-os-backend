import { BadRequestException } from '@nestjs/common'

import { AuthController } from './auth.controller'
import { CSRF_TOKEN_COOKIE, CSRF_TOKEN_HEADER, REFRESH_TOKEN_COOKIE } from './utils/session-cookie.util'

function createController(options: { allowPublicRegister?: boolean } = {}) {
  const authService = {
    login: jest.fn(async () => ({
      token: 'access-token',
      refreshToken: 'refresh-token-value-with-more-than-twenty-chars',
    })),
    refreshLoginToken: jest.fn(),
  }
  const userService = {
    register: jest.fn(),
  }
  const captchaService = {
    checkImgCaptcha: jest.fn(),
  }
  const redis = {
    ttl: jest.fn(async () => -2),
    incr: jest.fn(),
    expire: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  }

  const controller = new AuthController(
    authService as any,
    userService as any,
    captchaService as any,
    { allowPublicRegister: options.allowPublicRegister ?? false, globalPrefix: 'api' } as any,
    {
      refreshExpire: 3600,
      loginFailLimit: 5,
      loginFailWindow: 900,
      loginLockSeconds: 900,
    } as any,
    redis as any,
  )

  const reply = {
    setCookie: jest.fn(),
  }

  return { authService, controller, reply, userService }
}

describe('authController public endpoint hardening', () => {
  it('rejects public registration when the feature flag is disabled', async () => {
    const { controller, userService } = createController({ allowPublicRegister: false })

    await expect(controller.register({
      username: 'demo',
      password: 'a123456',
      lang: 'ZH',
    })).rejects.toBeInstanceOf(BadRequestException)
    expect(userService.register).not.toHaveBeenCalled()
  })

  it('declares local throttling on public auth POST endpoints', () => {
    const proto = AuthController.prototype
    const methods = ['login', 'register', 'refresh'] as const

    methods.forEach((method) => {
      const metadataKeys = Reflect.getMetadataKeys(proto[method]).map(String)
      expect(metadataKeys.some(key => key.toLowerCase().includes('throttler'))).toBe(true)
    })
  })

  it('sets HttpOnly refresh and readable CSRF cookies after login', async () => {
    const { controller, reply } = createController()

    await controller.login({
      username: 'demo',
      password: 'a123456',
      captchaId: 'captcha',
      verifyCode: '1234',
    }, '127.0.0.1', 'jest', reply as any)

    expect(reply.setCookie).toHaveBeenCalledWith(
      REFRESH_TOKEN_COOKIE,
      'refresh-token-value-with-more-than-twenty-chars',
      expect.objectContaining({
        httpOnly: true,
        path: '/api/auth/refresh',
        sameSite: 'lax',
      }),
    )
    expect(reply.setCookie).toHaveBeenCalledWith(
      CSRF_TOKEN_COOKIE,
      expect.any(String),
      expect.objectContaining({
        httpOnly: false,
        path: '/',
        sameSite: 'lax',
      }),
    )
  })

  it('issues CSRF cookies for cookie based auth clients', async () => {
    const { controller, reply } = createController()

    await expect(controller.csrf(reply as any)).resolves.toEqual({
      csrfToken: expect.any(String),
    })
    expect(reply.setCookie).toHaveBeenCalledWith(
      CSRF_TOKEN_COOKIE,
      expect.any(String),
      expect.objectContaining({ httpOnly: false, path: '/' }),
    )
  })

  it('keeps body refresh-token compatibility without requiring CSRF', async () => {
    const { authService, controller, reply } = createController()
    authService.refreshLoginToken.mockResolvedValue({
      accessToken: 'rotated-access-token',
      refreshToken: 'rotated-refresh-token-value-with-more-than-twenty-chars',
    })

    await expect(controller.refresh(
      { refreshToken: 'body-refresh-token-value-with-more-than-twenty-chars' },
      { cookies: {}, headers: {} } as any,
      reply as any,
    )).resolves.toEqual({
      token: 'rotated-access-token',
      refreshToken: 'rotated-refresh-token-value-with-more-than-twenty-chars',
    })
    expect(authService.refreshLoginToken).toHaveBeenCalledWith('body-refresh-token-value-with-more-than-twenty-chars')
  })

  it('allows cookie refresh only when CSRF header matches the CSRF cookie', async () => {
    const { authService, controller, reply } = createController()
    authService.refreshLoginToken.mockResolvedValue({
      accessToken: 'rotated-access-token',
      refreshToken: 'rotated-refresh-token-value-with-more-than-twenty-chars',
    })

    await expect(controller.refresh(
      {},
      {
        cookies: {
          [REFRESH_TOKEN_COOKIE]: 'cookie-refresh-token-value-with-more-than-twenty-chars',
          [CSRF_TOKEN_COOKIE]: 'csrf-token',
        },
        headers: {
          [CSRF_TOKEN_HEADER]: 'csrf-token',
        },
      } as any,
      reply as any,
    )).resolves.toEqual(expect.objectContaining({
      token: 'rotated-access-token',
    }))
    expect(authService.refreshLoginToken).toHaveBeenCalledWith('cookie-refresh-token-value-with-more-than-twenty-chars')
  })

  it('rejects cookie refresh requests without a matching CSRF token', async () => {
    const { controller, reply } = createController()

    await expect(controller.refresh(
      {},
      {
        cookies: {
          [REFRESH_TOKEN_COOKIE]: 'cookie-refresh-token-value-with-more-than-twenty-chars',
          [CSRF_TOKEN_COOKIE]: 'csrf-token',
        },
        headers: {},
      } as any,
      reply as any,
    )).rejects.toBeInstanceOf(BadRequestException)
  })
})
