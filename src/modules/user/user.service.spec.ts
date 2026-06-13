import { BadRequestException } from '@nestjs/common'

import { UserService } from './user.service'

function createService(managerOverrides: Record<string, any> = {}) {
  const manager = {
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    })),
    findBy: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn((_: any, payload: any) => payload),
    save: jest.fn(async (payload: any) => payload),
    update: jest.fn(),
    ...managerOverrides,
  }
  const entityManager = {
    transaction: jest.fn(async (callback: any) => callback(manager)),
  }
  const service = new UserService(
    {} as any,
    { findOneBy: jest.fn() } as any,
    { findBy: jest.fn() } as any,
    entityManager as any,
    { findValueByKey: jest.fn() } as any,
    {} as any,
  )

  return { service, manager, entityManager }
}

describe('userService tenant relation boundaries', () => {
  it('rejects role ids outside the target tenant when creating platform-managed users', async () => {
    const { service, manager } = createService({
      findBy: jest.fn(async () => [{ id: 11, tenantId: 2 }]),
    })

    await expect(service.create({
      username: 'tenant-admin-a',
      password: 'StrongPass123',
      tenantId: 2,
      roleIds: [11, 99],
      deptId: 5,
      status: 1,
    } as any)).rejects.toBeInstanceOf(BadRequestException)

    expect(manager.findBy).toHaveBeenCalledWith(expect.any(Function), {
      id: expect.any(Object),
      tenantId: 2,
    })
    expect(manager.save).not.toHaveBeenCalled()
  })

  it('rejects department ids outside the target tenant when creating platform-managed users', async () => {
    const { service, manager } = createService({
      findBy: jest.fn(async () => [{ id: 11, tenantId: 2 }]),
      findOneBy: jest.fn(async () => null),
    })

    await expect(service.create({
      username: 'tenant-admin-b',
      password: 'StrongPass123',
      tenantId: 2,
      roleIds: [11],
      deptId: 5,
      status: 1,
    } as any)).rejects.toBeInstanceOf(BadRequestException)

    expect(manager.findOneBy).toHaveBeenCalledWith(expect.any(Function), {
      id: 5,
      tenantId: 2,
    })
    expect(manager.save).not.toHaveBeenCalled()
  })

  it('requires role reassignment when changing a platform-managed user tenant', async () => {
    const currentUser = { id: 7, tenantId: 1, roles: [{ id: 1 }], dept: { id: 1 } }
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(async () => currentUser),
    }
    const { service, manager } = createService({
      createQueryBuilder: jest.fn(() => queryBuilder),
    })

    await expect(service.update(7, {
      tenantId: 2,
      status: 1,
    } as any)).rejects.toBeInstanceOf(BadRequestException)

    expect(manager.update).not.toHaveBeenCalled()
  })

  it('requires department reassignment when changing a platform-managed user tenant with an existing department', async () => {
    const currentUser = { id: 7, tenantId: 1, roles: [{ id: 1 }], dept: { id: 1 } }
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(async () => currentUser),
    }
    const { service, manager } = createService({
      createQueryBuilder: jest.fn(() => queryBuilder),
    })

    await expect(service.update(7, {
      tenantId: 2,
      roleIds: [12],
      status: 1,
    } as any)).rejects.toBeInstanceOf(BadRequestException)

    expect(manager.update).not.toHaveBeenCalled()
  })
})
