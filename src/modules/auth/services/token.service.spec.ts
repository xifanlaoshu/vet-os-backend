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
})
