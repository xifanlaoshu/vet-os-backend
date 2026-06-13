import { BusinessException } from '~/common/exceptions/biz.exception'
import { PharmacyService } from './pharmacy.service'

function createQueryBuilder(result: any = { items: [], meta: {} }) {
  const qb: any = {
    loadRelationCountAndMap: jest.fn(() => qb),
    andWhere: jest.fn(() => qb),
    where: jest.fn(() => qb),
    orderBy: jest.fn(() => qb),
    addOrderBy: jest.fn(() => qb),
    take: jest.fn(() => qb),
    skip: jest.fn(() => qb),
    limit: jest.fn(() => qb),
    offset: jest.fn(() => qb),
    getMany: jest.fn(async () => []),
    getCount: jest.fn(async () => 0),
    getRawOne: jest.fn(async () => ({ total: 0 })),
    getManyAndCount: jest.fn(async () => [result.items ?? [], result.meta?.totalItems ?? 0]),
  }
  qb.clone = jest.fn(() => qb)
  return qb
}

function createService(overrides: Partial<Record<
  'drugRepository'
  | 'batchRepository'
  | 'txnRepository'
  | 'chargeItemRepository'
  | 'consentTemplateRepository'
  | 'consentTemplateChargeItemRepository'
  | 'dataSource',
  any
>> = {}) {
  return new PharmacyService(
    overrides.drugRepository ?? {},
    overrides.batchRepository ?? {},
    overrides.txnRepository ?? {},
    overrides.chargeItemRepository ?? {},
    overrides.consentTemplateRepository ?? {},
    overrides.consentTemplateChargeItemRepository ?? {},
    overrides.dataSource ?? {},
  )
}

describe('pharmacyService tenant boundaries', () => {
  it('keeps tenant scope when drug list uses keyword search', async () => {
    const qb = createQueryBuilder()
    const service = createService({
      drugRepository: {
        createQueryBuilder: jest.fn(() => qb),
      },
    })
    const keyword = 'amoxicillin'

    await service.list({ keyword, page: 1, pageSize: 10 }, { tenantId: 2, areaId: 3 })

    expect(qb.andWhere).toHaveBeenCalledWith('d.tenantId = :tenantId', { tenantId: 2 })
    expect(qb.andWhere).toHaveBeenCalledWith(
      '(d.drugName LIKE :kw OR d.tradeName LIKE :kw OR d.drugCode LIKE :kw)',
      { kw: `%${keyword}%` },
    )
    expect(qb.where).not.toHaveBeenCalledWith(
      expect.stringContaining('d.drugName LIKE'),
      expect.anything(),
    )
  })

  it('validates charge item consent templates within the current tenant', async () => {
    const templateQb: any = {
      where: jest.fn(() => templateQb),
      andWhere: jest.fn(() => templateQb),
      getCount: jest.fn(async () => 0),
    }
    const service = createService({
      chargeItemRepository: {
        findOneBy: jest.fn(async () => ({ id: 10, tenantId: 2 })),
        update: jest.fn(async () => undefined),
      },
      consentTemplateRepository: {
        createQueryBuilder: jest.fn(() => templateQb),
      },
      consentTemplateChargeItemRepository: {
        delete: jest.fn(),
        save: jest.fn(),
        create: jest.fn(value => value),
      },
    })

    await expect(service.updateChargeItem(10, { consentTemplateIds: [99] }, { tenantId: 2 }))
      .rejects
      .toBeInstanceOf(BusinessException)

    expect(templateQb.where).toHaveBeenCalledWith('template.id IN (:...ids)', { ids: [99] })
    expect(templateQb.andWhere).toHaveBeenCalledWith('template.tenantId = :tenantId', { tenantId: 2 })
    expect(templateQb.andWhere).toHaveBeenCalledWith('template.isActive = :isActive', { isActive: 1 })
  })

  it('rejects charge item updates outside the current tenant', async () => {
    const update = jest.fn()
    const linkDelete = jest.fn()
    const service = createService({
      chargeItemRepository: {
        findOneBy: jest.fn(async () => null),
        update,
      },
      consentTemplateChargeItemRepository: {
        delete: linkDelete,
      },
    })

    await expect(service.updateChargeItem(10, { itemName: 'Cross tenant service', consentTemplateIds: [] }, { tenantId: 2 }))
      .rejects
      .toBeInstanceOf(BusinessException)

    expect(update).not.toHaveBeenCalled()
    expect(linkDelete).not.toHaveBeenCalled()
  })

  it('rejects batch updates outside the current area', async () => {
    const update = jest.fn()
    const service = createService({
      batchRepository: {
        findOneBy: jest.fn(async () => null),
        update,
      },
    })

    await expect(service.updateBatch(11, { batchNo: 'B-CROSS' }, { tenantId: 2, areaId: 3 }))
      .rejects
      .toBeInstanceOf(BusinessException)

    expect(update).not.toHaveBeenCalled()
  })
})

describe('pharmacyService stock transaction safety', () => {
  it('locks tenant-area drug batches before stock out and writes stock transaction snapshots', async () => {
    const batch = { id: 11, drugId: 5, quantity: 3, status: 1 }
    const qb: any = {
      setLock: jest.fn(() => qb),
      where: jest.fn(() => qb),
      andWhere: jest.fn(() => qb),
      orderBy: jest.fn(() => qb),
      addOrderBy: jest.fn(() => qb),
      getMany: jest.fn(async () => [batch]),
    }
    const saveBatch = jest.fn(async (value: any) => value)
    const txnCreate = jest.fn((value: any) => value)
    const txnSave = jest.fn(async (value: any) => value)
    const service = createService({
      dataSource: {
        transaction: jest.fn(async (callback: any) => callback({
          getRepository: jest.fn((entity: any) => {
            if (entity.name === 'DrugBatchEntity') {
              return {
                createQueryBuilder: jest.fn(() => qb),
                save: saveBatch,
              }
            }
            return {
              create: txnCreate,
              save: txnSave,
            }
          }),
        })),
      },
    })

    await service.stockOut(5, 2, {
      tenantId: 2,
      areaId: 3,
      refType: 'prescription',
      refId: 9,
      operatorId: 31,
    })

    expect(qb.setLock).toHaveBeenCalledWith('pessimistic_write')
    expect(qb.where).toHaveBeenCalledWith('batch.drugId = :drugId', { drugId: 5 })
    expect(qb.andWhere).toHaveBeenCalledWith('batch.tenantId = :tenantId', { tenantId: 2 })
    expect(qb.andWhere).toHaveBeenCalledWith('batch.areaId = :areaId', { areaId: 3 })
    expect(qb.andWhere).toHaveBeenCalledWith('batch.status = :status', { status: 1 })
    expect(saveBatch).toHaveBeenCalledWith(expect.objectContaining({
      id: 11,
      quantity: 1,
      status: 1,
    }))
    expect(txnSave).toHaveBeenCalledWith(expect.objectContaining({
      drugId: 5,
      batchId: 11,
      refType: 'prescription',
      refId: 9,
      operatorId: 31,
      tenantId: 2,
      areaId: 3,
      quantityBefore: 3,
      quantityChange: -2,
      quantityAfter: 1,
    }))
  })

  it('rejects stock out without mutating batches when tenant-area stock is insufficient', async () => {
    const qb: any = {
      setLock: jest.fn(() => qb),
      where: jest.fn(() => qb),
      andWhere: jest.fn(() => qb),
      orderBy: jest.fn(() => qb),
      addOrderBy: jest.fn(() => qb),
      getMany: jest.fn(async () => [{ id: 11, drugId: 5, quantity: 1, status: 1 }]),
    }
    const saveBatch = jest.fn()
    const txnSave = jest.fn()
    const service = createService({
      dataSource: {
        transaction: jest.fn(async (callback: any) => callback({
          getRepository: jest.fn((entity: any) => {
            if (entity.name === 'DrugBatchEntity') {
              return {
                createQueryBuilder: jest.fn(() => qb),
                save: saveBatch,
              }
            }
            return {
              create: jest.fn((value: any) => value),
              save: txnSave,
            }
          }),
        })),
      },
    })

    await expect(service.stockOut(5, 2, { tenantId: 2, areaId: 3 })).rejects.toBeInstanceOf(BusinessException)

    expect(qb.setLock).toHaveBeenCalledWith('pessimistic_write')
    expect(saveBatch).not.toHaveBeenCalled()
    expect(txnSave).not.toHaveBeenCalled()
  })
})
