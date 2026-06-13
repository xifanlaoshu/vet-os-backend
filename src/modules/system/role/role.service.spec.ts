import { BadRequestException } from '@nestjs/common'

import { RoleService } from './role.service'

function createQueryBuilder(result: any = null) {
  const qb: any = {
    clone: jest.fn(() => qb),
    where: jest.fn(() => qb),
    andWhere: jest.fn(() => qb),
    take: jest.fn(() => qb),
    skip: jest.fn(() => qb),
    getMany: jest.fn(async () => result ? [result] : []),
    getCount: jest.fn(async () => result ? 1 : 0),
    getOne: jest.fn(async () => result),
  }
  return qb
}

function createService(overrides: {
  roleRepository?: any
  menuRepository?: any
  entityManager?: any
} = {}) {
  return new RoleService(
    overrides.roleRepository ?? {} as any,
    overrides.menuRepository ?? {} as any,
    overrides.entityManager ?? { transaction: jest.fn(async callback => callback({ save: jest.fn() })) } as any,
  )
}

describe('roleService tenant boundaries', () => {
  it('filters role list by the current tenant', async () => {
    const qb = createQueryBuilder()
    const service = createService({
      roleRepository: {
        createQueryBuilder: jest.fn(() => qb),
      },
    })

    await service.list({ page: 1, pageSize: 10 } as any, { tenantId: 2 })

    expect(qb.where).toHaveBeenCalledWith('role.tenantId = :tenantId', { tenantId: 2 })
  })

  it('creates roles inside the current tenant', async () => {
    const save = jest.fn(async role => ({ ...role, id: 8 }))
    const service = createService({
      roleRepository: { save },
      menuRepository: { findBy: jest.fn(async () => []) },
    })

    await expect(service.create({
      name: 'Doctor',
      value: 'doctor',
      status: 1,
      menuIds: [],
    } as any, { tenantId: 2 })).resolves.toEqual({ roleId: 8 })

    expect(save).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 2 }))
  })

  it('rejects updating roles outside the current tenant', async () => {
    const update = jest.fn()
    const service = createService({
      roleRepository: {
        findOneBy: jest.fn(async () => null),
        update,
      },
    })

    await expect(service.update(9, { name: 'Other' } as any, { tenantId: 2 })).rejects.toBeInstanceOf(BadRequestException)
    expect(update).not.toHaveBeenCalled()
  })

  it('resolves user role ids inside the selected tenant', async () => {
    const find = jest.fn(async () => [{ id: 11 }])
    const service = createService({
      roleRepository: { find },
    })

    await expect(service.getRoleIdsByUser(7, 2)).resolves.toEqual([11])
    expect(find).toHaveBeenCalledWith({
      where: {
        users: { id: 7 },
        tenantId: 2,
      },
    })
  })

  it('deletes roles only after a tenant-scoped lookup succeeds', async () => {
    const deleteRole = jest.fn(async () => ({ affected: 1 }))
    const service = createService({
      roleRepository: {
        findOneBy: jest.fn(async () => ({ id: 12, tenantId: 2 })),
        delete: deleteRole,
      },
    })

    await expect(service.delete(12, { tenantId: 2 })).resolves.toBeUndefined()
    expect(deleteRole).toHaveBeenCalledWith({ id: 12, tenantId: 2 })
  })
})
