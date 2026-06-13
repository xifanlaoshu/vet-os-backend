import { ForbiddenException } from '@nestjs/common'

import { ServeController } from './serve.controller'

function createController() {
  const serveService = {
    getServeStat: jest.fn(async () => ({ cpu: { cores: 8 } })),
  }

  return {
    controller: new ServeController(serveService as any),
    serveService,
  }
}

const platformUser = { uid: 1, platformAdmin: true } as any
const tenantUser = { uid: 7, platformAdmin: false } as any

describe('serveController platform boundaries', () => {
  it('rejects server monitoring for non-platform administrators', async () => {
    const { controller, serveService } = createController()

    await expect(controller.stat(tenantUser))
      .rejects
      .toBeInstanceOf(ForbiddenException)
    expect(serveService.getServeStat).not.toHaveBeenCalled()
  })

  it('allows platform administrators to inspect server monitoring', async () => {
    const { controller, serveService } = createController()

    await expect(controller.stat(platformUser)).resolves.toEqual({ cpu: { cores: 8 } })
    expect(serveService.getServeStat).toHaveBeenCalled()
  })
})
