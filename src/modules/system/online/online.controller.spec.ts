import { ForbiddenException } from '@nestjs/common'

import { BusinessException } from '~/common/exceptions/biz.exception'

import { OnlineController } from './online.controller'

function createController() {
  const onlineService = {
    listOnlineUser: jest.fn(async () => [{ tokenId: 'token-1', username: 'admin' }]),
    kickUser: jest.fn(),
  }

  return {
    controller: new OnlineController(onlineService as any),
    onlineService,
  }
}

const platformUser = { uid: 1, platformAdmin: true } as any
const tenantUser = { uid: 7, platformAdmin: false } as any

describe('onlineController platform boundaries', () => {
  it('rejects online user list access for non-platform administrators', async () => {
    const { controller, onlineService } = createController()

    await expect(controller.list({ accessToken: 'token' } as any, tenantUser))
      .rejects
      .toBeInstanceOf(ForbiddenException)
    expect(onlineService.listOnlineUser).not.toHaveBeenCalled()
  })

  it('keeps invalid-login behavior for platform administrators without an access token', async () => {
    const { controller, onlineService } = createController()

    await expect(controller.list({} as any, platformUser))
      .rejects
      .toBeInstanceOf(BusinessException)
    expect(onlineService.listOnlineUser).not.toHaveBeenCalled()
  })

  it('allows platform administrators to list online users', async () => {
    const { controller, onlineService } = createController()

    await expect(controller.list({ accessToken: 'token' } as any, platformUser))
      .resolves
      .toEqual([{ tokenId: 'token-1', username: 'admin' }])
    expect(onlineService.listOnlineUser).toHaveBeenCalledWith('token')
  })

  it('rejects kicking online users for non-platform administrators', async () => {
    const { controller, onlineService } = createController()

    await expect(controller.kick({ tokenId: 'token-1' }, tenantUser))
      .rejects
      .toBeInstanceOf(ForbiddenException)
    expect(onlineService.kickUser).not.toHaveBeenCalled()
  })

  it('allows platform administrators to kick online users', async () => {
    const { controller, onlineService } = createController()

    await expect(controller.kick({ tokenId: 'token-1' }, platformUser)).resolves.toBeUndefined()
    expect(onlineService.kickUser).toHaveBeenCalledWith('token-1', platformUser)
  })
})
