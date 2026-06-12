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
})
