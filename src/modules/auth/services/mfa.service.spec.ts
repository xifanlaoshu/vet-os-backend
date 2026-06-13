import { BusinessException } from '~/common/exceptions/biz.exception'
import { UserEntity } from '~/modules/user/user.entity'

import * as mfaUtil from '../utils/mfa.util'
import { MfaService } from './mfa.service'

describe('mfaService security boundaries', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  function createService(redisOverrides: Partial<Record<'set' | 'get' | 'del', jest.Mock>> = {}) {
    const redis = {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      ...redisOverrides,
    }
    const service = new MfaService(redis as any, {
      cookieSecret: 'cookie-secret-with-enough-random-looking-length-1234567890',
    } as any)
    return { redis, service }
  }

  it('creates temporary MFA setup secrets without storing the plain secret in Redis', async () => {
    const { redis, service } = createService()

    const result = await service.createSetup({ uid: 7, accountId: 7 } as any)

    expect(result.secret).toMatch(/^[A-Z2-7]+$/)
    expect(result.otpauthUrl).toContain('otpauth://totp/')
    expect(redis.set).toHaveBeenCalledWith(
      'auth:mfa:setup:7',
      expect.not.stringContaining(result.secret),
      'EX',
      600,
    )
  })

  it('enables MFA only after validating the pending setup code', async () => {
    const encryptedSecret = mfaUtil.encryptMfaSecret(
      'JBSWY3DPEHPK3PXP',
      'cookie-secret-with-enough-random-looking-length-1234567890',
    )
    const { redis, service } = createService({
      get: jest.fn(async () => encryptedSecret),
    })
    jest.spyOn(mfaUtil, 'verifyTotpCode').mockReturnValue(true)
    const updateSpy = jest.spyOn(UserEntity, 'update').mockResolvedValue({} as any)

    await service.enable({ uid: 7 } as any, '123456')

    expect(mfaUtil.verifyTotpCode).toHaveBeenCalledWith('JBSWY3DPEHPK3PXP', '123456')
    expect(updateSpy).toHaveBeenCalledWith({ id: 7 }, {
      mfaEnabled: true,
      mfaSecret: encryptedSecret,
    })
    expect(redis.del).toHaveBeenCalledWith('auth:mfa:setup:7')
  })

  it('rejects login when enabled MFA codes are missing or invalid', () => {
    const { service } = createService()
    jest.spyOn(mfaUtil, 'verifyTotpCode').mockReturnValue(false)
    const encryptedSecret = mfaUtil.encryptMfaSecret(
      'JBSWY3DPEHPK3PXP',
      'cookie-secret-with-enough-random-looking-length-1234567890',
    )

    expect(() => service.assertLoginAllowed({
      mfaEnabled: true,
      mfaSecret: encryptedSecret,
    } as any, '000000')).toThrow(BusinessException)
  })
})
