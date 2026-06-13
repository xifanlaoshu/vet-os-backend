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

  it('rotates refresh tokens by removing the previous access-token session and returning blacklist metadata', async () => {
    const expiredAt = new Date(Date.now() + 60_000)
    const previousAccessToken = {
      id: 'access-id',
      value: 'previous-access-token',
      expired_at: expiredAt,
      user: { id: 7 },
      remove: jest.fn().mockResolvedValue(undefined),
    }
    jest.spyOn(RefreshTokenEntity, 'findOne').mockResolvedValue({
      value: 'hashed-refresh-token',
      expired_at: new Date(Date.now() + 3_600_000),
      accessToken: previousAccessToken,
    } as any)
    const redis = { del: jest.fn() }
    const roleService = {
      getRoleIdsByUser: jest.fn(async () => [21]),
      getRoleValues: jest.fn(async () => ['doctor']),
    }
    const jwtService = {
      verifyAsync: jest.fn(async () => ({ tenantId: 2, areaId: 3, contextSelected: true })),
    }
    const service = new TokenService(
      jwtService as any,
      roleService as any,
      redis as any,
      { jwtExprire: 300, refreshExpire: 3600, refreshSecret: 'refresh-secret' } as any,
    )
    jest.spyOn(service, 'generateAccessToken').mockResolvedValue({
      accessToken: 'next-access-token',
      refreshToken: 'next-refresh-token',
    })

    await expect(service.rotateRefreshToken('refresh-token')).resolves.toEqual({
      uid: 7,
      accessToken: 'next-access-token',
      refreshToken: 'next-refresh-token',
      previousAccessToken: 'previous-access-token',
      previousAccessTokenExpiresAt: expiredAt,
    })
    expect(roleService.getRoleIdsByUser).toHaveBeenCalledWith(7, 2)
    expect(redis.del).toHaveBeenCalledWith('online:user:access-id')
    expect(previousAccessToken.remove).toHaveBeenCalledTimes(1)
  })
})
