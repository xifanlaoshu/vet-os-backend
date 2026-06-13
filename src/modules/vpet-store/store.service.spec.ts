import { BusinessException } from '~/common/exceptions/biz.exception'

import { StoreService } from './store.service'

function createStoreService(overrides: {
  storeRepository?: any
  stockRepository?: any
  transferRepository?: any
  transferItemRepository?: any
  drugRepository?: any
  dataSource?: any
} = {}) {
  return new StoreService(
    overrides.storeRepository ?? {} as any,
    overrides.stockRepository ?? {} as any,
    overrides.transferRepository ?? {} as any,
    overrides.transferItemRepository ?? {} as any,
    overrides.drugRepository ?? {} as any,
    overrides.dataSource ?? {} as any,
  ) as any
}

function createQueryBuilder(result: any) {
  const qb: any = {
    setLock: jest.fn(() => qb),
    leftJoinAndSelect: jest.fn(() => qb),
    where: jest.fn(() => qb),
    andWhere: jest.fn(() => qb),
    getOne: jest.fn(async () => result),
  }
  return qb
}

describe('storeService transfer workflow boundaries', () => {
  it('rejects approving transfers that are not pending', async () => {
    const update = jest.fn()
    const service = createStoreService({
      transferRepository: {
        findOneBy: jest.fn(async () => ({ id: 8, status: 2 })),
        update,
      },
    })

    await expect(service.approveTransfer(8, { approvedBy: 31 }, { tenantId: 2, areaId: 3 }))
      .rejects
      .toBeInstanceOf(BusinessException)
    expect(update).not.toHaveBeenCalled()
  })

  it('locks transfer and stock rows when completing approved transfers', async () => {
    const transferQb = createQueryBuilder({ id: 8, status: 2, sourceStoreId: 1, targetStoreId: 2 })
    const sourceStock = { id: 11, storeId: 1, drugId: 5, quantity: 10 }
    const targetStock = { id: 12, storeId: 2, drugId: 5, quantity: 3 }
    const stockQbs = [createQueryBuilder(sourceStock), createQueryBuilder(targetStock)]
    const saveStock = jest.fn(async (value: any) => value)
    const transferUpdate = jest.fn(async () => ({ affected: 1 }))
    const service = createStoreService({
      dataSource: {
        transaction: jest.fn(async (callback: any) => callback({
          getRepository: jest.fn((entity: any) => {
            if (entity.name === 'DrugTransferEntity') {
              return {
                createQueryBuilder: jest.fn(() => transferQb),
                update: transferUpdate,
                findOne: jest.fn(async () => ({ id: 8, status: 3 })),
              }
            }
            if (entity.name === 'DrugTransferItemEntity') {
              return {
                find: jest.fn(async () => [{ id: 1, transferId: 8, drugId: 5, drugName: 'Drug A', quantity: 4 }]),
              }
            }
            return {
              createQueryBuilder: jest.fn(() => stockQbs.shift()),
              create: jest.fn((value: any) => value),
              save: saveStock,
            }
          }),
        })),
      },
    })

    await service.completeTransfer(8, { tenantId: 2, areaId: 3 })

    expect(transferQb.setLock).toHaveBeenCalledWith('pessimistic_write')
    expect(saveStock).toHaveBeenCalledWith(expect.objectContaining({ id: 11, quantity: 6 }))
    expect(saveStock).toHaveBeenCalledWith(expect.objectContaining({ id: 12, quantity: 7 }))
    expect(transferUpdate).toHaveBeenCalledWith(
      { id: 8, tenantId: 2, areaId: 3 },
      expect.objectContaining({ status: 3 }),
    )
  })

  it('rejects completing transfers when locked source stock is insufficient', async () => {
    const transferQb = createQueryBuilder({ id: 8, status: 2, sourceStoreId: 1, targetStoreId: 2 })
    const sourceStockQb = createQueryBuilder({ id: 11, storeId: 1, drugId: 5, quantity: 1 })
    const saveStock = jest.fn()
    const transferUpdate = jest.fn()
    const service = createStoreService({
      dataSource: {
        transaction: jest.fn(async (callback: any) => callback({
          getRepository: jest.fn((entity: any) => {
            if (entity.name === 'DrugTransferEntity') {
              return {
                createQueryBuilder: jest.fn(() => transferQb),
                update: transferUpdate,
              }
            }
            if (entity.name === 'DrugTransferItemEntity') {
              return {
                find: jest.fn(async () => [{ id: 1, transferId: 8, drugId: 5, drugName: 'Drug A', quantity: 4 }]),
              }
            }
            return {
              createQueryBuilder: jest.fn(() => sourceStockQb),
              save: saveStock,
            }
          }),
        })),
      },
    })

    await expect(service.completeTransfer(8, { tenantId: 2, areaId: 3 }))
      .rejects
      .toBeInstanceOf(BusinessException)

    expect(transferQb.setLock).toHaveBeenCalledWith('pessimistic_write')
    expect(sourceStockQb.setLock).toHaveBeenCalledWith('pessimistic_write')
    expect(saveStock).not.toHaveBeenCalled()
    expect(transferUpdate).not.toHaveBeenCalled()
  })
})
