import { BusinessException } from '~/common/exceptions/biz.exception'

import { ResourceGuard } from './resource.guard'

class DemoEntity {}

function createExecutionContext(user: any): any {
  return {
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({
        headers: {},
        params: { id: 9 },
        body: {},
        query: {},
        user,
      }),
    }),
  }
}

function createGuard(resourceMetadata: any, repo: any) {
  const reflector = {
    getAllAndOverride: jest.fn(() => false),
    get: jest.fn(() => resourceMetadata),
  }
  const dataSource = {
    getRepository: jest.fn(() => repo),
  }
  return {
    guard: new ResourceGuard(reflector as any, dataSource as any),
    dataSource,
  }
}

describe('resourceGuard platform ownership bypass', () => {
  it('does not bypass ownership checks for tenant users with an admin role value', async () => {
    const repo = { find: jest.fn(async () => []) }
    const { guard, dataSource } = createGuard({ entity: DemoEntity }, repo)

    await expect(guard.canActivate(createExecutionContext({
      uid: 7,
      roles: ['admin'],
      platformAdmin: false,
    }))).rejects.toBeInstanceOf(BusinessException)

    expect(dataSource.getRepository).toHaveBeenCalledWith(DemoEntity)
  })

  it('bypasses ownership checks only for explicit platform administrators', async () => {
    const repo = { find: jest.fn(async () => []) }
    const { guard, dataSource } = createGuard({ entity: DemoEntity }, repo)

    await expect(guard.canActivate(createExecutionContext({
      uid: 1,
      roles: [],
      platformAdmin: true,
    }))).resolves.toBe(true)

    expect(dataSource.getRepository).not.toHaveBeenCalled()
  })
})
