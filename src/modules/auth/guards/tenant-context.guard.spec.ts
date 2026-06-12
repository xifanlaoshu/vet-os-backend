import { BusinessException } from '~/common/exceptions/biz.exception'
import { PUBLIC_KEY } from '../auth.constant'
import { TenantContextGuard } from './tenant-context.guard'

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

function createReflector(isPublic = false) {
  return {
    getAllAndOverride: jest.fn((key: string) => key === PUBLIC_KEY && isPublic),
  }
}

describe('tenantContextGuard boundaries', () => {
  it('blocks business routes before tenant and area context is selected', async () => {
    const guard = new TenantContextGuard(createReflector() as any, { assertContextWritable: jest.fn() } as any)

    await expect(guard.canActivate(createExecutionContext({
      method: 'GET',
      url: '/api/vpet/customer',
      user: { uid: 9, contextSelected: false },
    }))).rejects.toBeInstanceOf(BusinessException)
  })

  it('allows context bootstrap routes before tenant and area context is selected', async () => {
    const tenantService = { assertContextWritable: jest.fn() }
    const guard = new TenantContextGuard(createReflector() as any, tenantService as any)

    await expect(guard.canActivate(createExecutionContext({
      method: 'GET',
      url: '/api/account/context',
      user: { uid: 9, contextSelected: false },
    }))).resolves.toBe(true)
    expect(tenantService.assertContextWritable).not.toHaveBeenCalled()
  })

  it('validates tenant and area lifecycle for write requests', async () => {
    const tenantService = { assertContextWritable: jest.fn(async () => undefined) }
    const guard = new TenantContextGuard(createReflector() as any, tenantService as any)
    const user = { uid: 9, tenantId: 2, areaId: 3, contextSelected: true }

    await expect(guard.canActivate(createExecutionContext({
      method: 'POST',
      url: '/api/vpet/customer',
      user,
    }))).resolves.toBe(true)
    expect(tenantService.assertContextWritable).toHaveBeenCalledWith(user)
  })

  it('does not validate writable lifecycle for read requests', async () => {
    const tenantService = { assertContextWritable: jest.fn() }
    const guard = new TenantContextGuard(createReflector() as any, tenantService as any)

    await expect(guard.canActivate(createExecutionContext({
      method: 'GET',
      url: '/api/vpet/customer',
      user: { uid: 9, tenantId: 2, areaId: 3, contextSelected: true },
    }))).resolves.toBe(true)
    expect(tenantService.assertContextWritable).not.toHaveBeenCalled()
  })
})
