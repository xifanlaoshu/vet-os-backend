import { BadRequestException } from '@nestjs/common'

import { TenantController } from './tenant.controller'
import { TenantService } from './tenant.service'

function createQueryBuilder(rawRows: any[] = [], entityRows: any[] = []) {
  const qb: any = {
    innerJoin: jest.fn(() => qb),
    innerJoinAndMapOne: jest.fn(() => qb),
    leftJoinAndMapOne: jest.fn(() => qb),
    select: jest.fn(() => qb),
    where: jest.fn(() => qb),
    andWhere: jest.fn(() => qb),
    orderBy: jest.fn(() => qb),
    addOrderBy: jest.fn(() => qb),
    getRawMany: jest.fn(async () => rawRows),
    getMany: jest.fn(async () => entityRows),
    getOne: jest.fn(async () => entityRows[0] ?? null),
  }
  return qb
}

function createService({
  tenantRepository = {},
  areaRepository = {},
  userAreaRepository = {},
  strictTenantContext = true,
}: {
  tenantRepository?: any
  areaRepository?: any
  userAreaRepository?: any
  strictTenantContext?: boolean
} = {}) {
  return new TenantService(
    tenantRepository,
    areaRepository,
    userAreaRepository,
    { strictTenantContext } as any,
  )
}

describe('tenantService security boundaries', () => {
  it('filters disabled tenants and areas from regular user context options', async () => {
    const qb = createQueryBuilder([{
      tenant_id: 2,
      tenant_name: 'Tenant A',
      area_id: 3,
      area_name: 'Area A',
      default_area: 1,
    }])
    const service = createService({
      userAreaRepository: {
        createQueryBuilder: jest.fn(() => qb),
      },
    })

    await expect(service.getUserAreaOptions(9)).resolves.toEqual([{
      tenantId: 2,
      tenantName: 'Tenant A',
      areaId: 3,
      areaName: 'Area A',
      defaultArea: true,
    }])

    expect(qb.innerJoin).toHaveBeenCalledWith(
      expect.any(Function),
      'tenant',
      'tenant.id = ua.tenant_id AND tenant.status = 1',
    )
    expect(qb.innerJoin).toHaveBeenCalledWith(
      expect.any(Function),
      'area',
      'area.id = ua.area_id AND area.tenant_id = ua.tenant_id AND area.status = 1',
    )
  })

  it('filters disabled tenants and areas from platform-admin context options', async () => {
    const qb = createQueryBuilder([{
      tenant_id: 2,
      tenant_name: 'Tenant A',
      area_id: 3,
      area_name: 'Area A',
      default_area: 0,
    }])
    const service = createService({
      areaRepository: {
        createQueryBuilder: jest.fn(() => qb),
      },
    })

    await expect(service.getUserAreaOptions(1, true)).resolves.toEqual([{
      tenantId: 2,
      tenantName: 'Tenant A',
      areaId: 3,
      areaName: 'Area A',
      defaultArea: false,
    }])

    expect(qb.innerJoin).toHaveBeenCalledWith(
      expect.any(Function),
      'tenant',
      'tenant.id = area.tenant_id AND tenant.status = 1',
    )
    expect(qb.where).toHaveBeenCalledWith('area.status = 1')
  })

  it('filters disabled tenants from area option selectors', async () => {
    const qb = createQueryBuilder([], [{ id: 3, tenantId: 2, status: 1 }])
    const service = createService({
      areaRepository: {
        createQueryBuilder: jest.fn(() => qb),
      },
    })

    await service.areaOptions(2)

    expect(qb.innerJoinAndMapOne).toHaveBeenCalledWith(
      'area.tenant',
      expect.any(Function),
      'tenant',
      'tenant.id = area.tenantId AND tenant.status = 1',
    )
    expect(qb.where).toHaveBeenCalledWith('area.status = 1')
    expect(qb.andWhere).toHaveBeenCalledWith('area.tenantId = :tenantId', { tenantId: 2 })
  })

  it('rejects context selection when no active tenant-area option remains', async () => {
    const qb = createQueryBuilder([])
    const service = createService({
      userAreaRepository: {
        createQueryBuilder: jest.fn(() => qb),
      },
    })

    await expect(service.assertUserArea(9, 2, 3)).rejects.toBeInstanceOf(BadRequestException)
  })

  it('rejects writes when the current tenant is disabled', async () => {
    const service = createService({
      tenantRepository: {
        findOneBy: jest.fn(async () => null),
      },
      areaRepository: {
        findOneBy: jest.fn(async () => ({ id: 3, tenantId: 2, status: 1 })),
      },
    })

    await expect(service.assertContextWritable({ tenantId: 2, areaId: 3 })).rejects.toBeInstanceOf(BadRequestException)
  })

  it('rejects writes when the current area is disabled', async () => {
    const service = createService({
      tenantRepository: {
        findOneBy: jest.fn(async () => ({ id: 2, status: 1 })),
      },
      areaRepository: {
        findOneBy: jest.fn(async () => null),
      },
    })

    await expect(service.assertContextWritable({ tenantId: 2, areaId: 3 })).rejects.toBeInstanceOf(BadRequestException)
  })

  it('validates user-area grants through an active tenant and active area join', async () => {
    const areaQb = createQueryBuilder([], [])
    const service = createService({
      areaRepository: {
        createQueryBuilder: jest.fn(() => areaQb),
      },
    })

    await expect(service.saveUserAreaGrants(9, {
      items: [{ tenantId: 2, areaId: 3, defaultArea: 1 }],
    } as any)).rejects.toBeInstanceOf(BadRequestException)

    expect(areaQb.innerJoin).toHaveBeenCalledWith(
      expect.any(Function),
      'tenant',
      'tenant.id = area.tenant_id AND tenant.status = 1',
    )
    expect(areaQb.andWhere).toHaveBeenCalledWith('area.status = 1')
  })
})

describe('tenantController security boundaries', () => {
  it('passes platform-admin context into tenant context bootstrap', async () => {
    const tenantService = {
      resolveDefaultContext: jest.fn(async () => ({ tenantId: 1, areaId: 1 })),
    }
    const controller = new TenantController(tenantService as any)

    await controller.context({ uid: 1, platformAdmin: true } as any)

    expect(tenantService.resolveDefaultContext).toHaveBeenCalledWith(1, true)
  })
})
