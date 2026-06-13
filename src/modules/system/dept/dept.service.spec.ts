import { BusinessException } from '~/common/exceptions/biz.exception'

import { DeptService } from './dept.service'

function createQueryBuilder(result: any = null) {
  const qb: any = {
    leftJoinAndSelect: jest.fn(() => qb),
    where: jest.fn(() => qb),
    andWhere: jest.fn(() => qb),
    getOne: jest.fn(async () => result),
  }
  return qb
}

function createService(overrides: {
  userRepository?: any
  deptRepository?: any
  entityManager?: any
} = {}) {
  return new DeptService(
    overrides.userRepository ?? {} as any,
    overrides.deptRepository ?? {} as any,
    overrides.entityManager ?? {} as any,
  )
}

describe('deptService tenant boundaries', () => {
  it('filters department tree queries by the current tenant', async () => {
    const find = jest.fn(async () => [{
      id: 1,
      tenantId: 2,
      name: 'Clinic',
      parent: null,
      orderNo: 1,
    }])
    const service = createService({
      deptRepository: { find },
    })

    await expect(service.getDeptTree({}, { tenantId: 2 })).resolves.toEqual([expect.objectContaining({ id: 1 })])
    expect(find).toHaveBeenCalledWith({
      where: { tenantId: 2 },
      relations: ['parent'],
      order: { orderNo: 'DESC' },
    })
  })

  it('rejects creating departments under parents outside the current tenant', async () => {
    const save = jest.fn()
    const service = createService({
      deptRepository: {
        findOneBy: jest.fn(async () => null),
        save,
      },
    })

    await expect(service.create({ name: 'Front Desk', parentId: 9 } as any, { tenantId: 2 }))
      .rejects
      .toBeInstanceOf(BusinessException)
    expect(save).not.toHaveBeenCalled()
  })

  it('rejects updating departments outside the current tenant', async () => {
    const save = jest.fn()
    const service = createService({
      deptRepository: {
        findOneBy: jest.fn(async () => null),
        save,
      },
    })

    await expect(service.update(8, { name: 'Other' } as any, { tenantId: 2 }))
      .rejects
      .toBeInstanceOf(BusinessException)
    expect(save).not.toHaveBeenCalled()
  })

  it('deletes departments with tenant-scoped criteria', async () => {
    const deleteDept = jest.fn(async () => ({ affected: 1 }))
    const service = createService({
      deptRepository: {
        delete: deleteDept,
      },
    })

    await expect(service.delete(8, { tenantId: 2 })).resolves.toBeUndefined()
    expect(deleteDept).toHaveBeenCalledWith({ id: 8, tenantId: 2 })
  })

  it('counts users by department inside the current tenant', async () => {
    const countBy = jest.fn(async () => 2)
    const service = createService({
      userRepository: { countBy },
    })

    await expect(service.countUserByDeptId(8, { tenantId: 2 })).resolves.toBe(2)
    expect(countBy).toHaveBeenCalledWith({ tenantId: 2, dept: { id: 8 } })
  })

  it('loads department detail with tenant scope', async () => {
    const qb = createQueryBuilder({ id: 8, tenantId: 2 })
    const service = createService({
      deptRepository: {
        createQueryBuilder: jest.fn(() => qb),
      },
    })

    await expect(service.info(8, { tenantId: 2 })).resolves.toEqual({ id: 8, tenantId: 2 })
    expect(qb.andWhere).toHaveBeenCalledWith('dept.tenantId = :tenantId', { tenantId: 2 })
  })
})
