import { BadRequestException } from '@nestjs/common'

import { DictItemService } from './dict-item.service'

function createQueryBuilder() {
  const qb: any = {
    clone: jest.fn(() => qb),
    orderBy: jest.fn(() => qb),
    where: jest.fn(() => qb),
    take: jest.fn(() => qb),
    skip: jest.fn(() => qb),
    limit: jest.fn(() => qb),
    offset: jest.fn(() => qb),
    getMany: jest.fn(async () => []),
    getCount: jest.fn(async () => 0),
  }
  return qb
}

function createService({
  dictItemRepository = {},
  dictTypeRepository = {},
}: {
  dictItemRepository?: any
  dictTypeRepository?: any
} = {}) {
  return new DictItemService(
    {
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findOneBy: jest.fn(),
      createQueryBuilder: jest.fn(() => createQueryBuilder()),
      ...dictItemRepository,
    },
    {
      findOneBy: jest.fn(async () => ({ id: 5, tenantId: 2 })),
      ...dictTypeRepository,
    },
  )
}

describe('dictItemService tenant boundaries', () => {
  it('rejects creating dictionary items under a type outside the current tenant', async () => {
    const service = createService({
      dictTypeRepository: {
        findOneBy: jest.fn(async () => null),
      },
    })

    await expect(service.create({
      typeId: 5,
      label: '启用',
      value: '1',
    } as any, { tenantId: 2 } as any)).rejects.toBeInstanceOf(BadRequestException)
  })

  it('validates dictionary type tenant before inserting dictionary items', async () => {
    const dictItemRepository = {
      insert: jest.fn(),
    }
    const dictTypeRepository = {
      findOneBy: jest.fn(async () => ({ id: 5, tenantId: 2 })),
    }
    const service = createService({ dictItemRepository, dictTypeRepository })

    await expect(service.create({
      typeId: 5,
      label: '启用',
      value: '1',
    } as any, { tenantId: 2 } as any)).resolves.toBeUndefined()

    expect(dictTypeRepository.findOneBy).toHaveBeenCalledWith({ id: 5, tenantId: 2 })
    expect(dictItemRepository.insert).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 2,
      type: { id: 5 },
    }))
  })

  it('rejects updates that move dictionary items to a type outside the current tenant', async () => {
    const dictItemRepository = {
      update: jest.fn(),
    }
    const service = createService({
      dictItemRepository,
      dictTypeRepository: {
        findOneBy: jest.fn(async () => null),
      },
    })

    await expect(service.update(9, {
      typeId: 5,
      label: '启用',
      value: '1',
    } as any, { tenantId: 2 } as any)).rejects.toBeInstanceOf(BadRequestException)
    expect(dictItemRepository.update).not.toHaveBeenCalled()
  })

  it('validates dictionary type tenant before listing dictionary items', async () => {
    const qb = createQueryBuilder()
    const dictItemRepository = {
      createQueryBuilder: jest.fn(() => qb),
    }
    const dictTypeRepository = {
      findOneBy: jest.fn(async () => ({ id: 5, tenantId: 2 })),
    }
    const service = createService({ dictItemRepository, dictTypeRepository })

    await service.page({ page: 1, pageSize: 10, typeId: 5 } as any, { tenantId: 2 } as any)

    expect(dictTypeRepository.findOneBy).toHaveBeenCalledWith({ id: 5, tenantId: 2 })
    expect(dictItemRepository.createQueryBuilder).toHaveBeenCalledWith('dict_item')
  })
})
