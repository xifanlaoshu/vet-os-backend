import { BadRequestException } from '@nestjs/common'

import { AuthController } from './auth.controller'

function createController(options: { allowPublicRegister?: boolean } = {}) {
  const authService = {
    refreshLoginToken: jest.fn(),
  }
  const userService = {
    register: jest.fn(),
  }
  const captchaService = {
    checkImgCaptcha: jest.fn(),
  }
  const redis = {
    ttl: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  }

  const controller = new AuthController(
    authService as any,
    userService as any,
    captchaService as any,
    { allowPublicRegister: options.allowPublicRegister ?? false } as any,
    {
      loginFailLimit: 5,
      loginFailWindow: 900,
      loginLockSeconds: 900,
    } as any,
    redis as any,
  )

  return { controller, userService }
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
})
