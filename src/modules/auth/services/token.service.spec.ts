import { AccessTokenEntity } from '../entities/access-token.entity'
import { RefreshTokenEntity } from '../entities/refresh-token.entity'

import { TokenService } from './token.service'

describe('tokenService session cleanup', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('removes an orphan refresh token without dereferencing a missing access token', async () => {
    const refreshToken = {
      accessToken: null,
      remove: jest.fn().mockResolvedValue(undefined),
    }
    jest.spyOn(RefreshTokenEntity, 'findOne').mockResolvedValue(refreshToken as any)

    const service = new TokenService(
      {} as any,
      {} as any,
      { del: jest.fn() } as any,
      {} as any,
    )

    await expect(service.removeRefreshToken('refresh-token')).resolves.toBeUndefined()
    expect(refreshToken.remove).toHaveBeenCalledTimes(1)
  })

  it('does not derive platformAdmin from an admin role value', async () => {
    const jwtService = {
      signAsync: jest.fn(async () => 'signed-token'),
    }
    const accessTokenSave = jest.fn(async function save(this: any) {
      this.id = 33
      return this
    })
    const refreshTokenSave = jest.fn(async function save(this: any) {
      return this
    })
    const accessTokenSpy = jest.spyOn(AccessTokenEntity.prototype, 'save').mockImplementation(accessTokenSave as any)
    const refreshTokenSpy = jest.spyOn(RefreshTokenEntity.prototype, 'save').mockImplementation(refreshTokenSave as any)

    const service = new TokenService(
      jwtService as any,
      {} as any,
      {} as any,
      { jwtExprire: 300, refreshExpire: 3600, refreshSecret: 'refresh-secret' } as any,
    )

    await service.generateAccessToken(7, ['admin'], {})

    expect(jwtService.signAsync).toHaveBeenNthCalledWith(1, expect.objectContaining({
      roles: ['admin'],
      platformAdmin: false,
    }))
    refreshTokenSpy.mockRestore()
    accessTokenSpy.mockRestore()
  })
})
