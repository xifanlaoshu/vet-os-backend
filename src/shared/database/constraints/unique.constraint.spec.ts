import { UniqueConstraint } from './unique.constraint'

class DemoEntity {}

function createConstraint(options: {
  existing?: any
  tenantId?: number
  operateId?: number
} = {}) {
  const findOne = jest.fn(async () => options.existing ?? null)
  const dataSource = {
    getRepository: jest.fn(() => ({
      metadata: { columns: [] },
      findOne,
    })),
  }
  const cls = {
    get: jest.fn((key: string) => {
      if (key === 'tenantId')
        return options.tenantId
      if (key === 'operateId')
        return options.operateId
      return undefined
    }),
  }
  return {
    constraint: new UniqueConstraint(dataSource as any, cls as any),
    findOne,
    cls,
  }
}

describe('uniqueConstraint tenant scope', () => {
  it('checks uniqueness inside the current tenant when tenantScoped is enabled', async () => {
    const { constraint, findOne } = createConstraint({ tenantId: 2 })

    await expect(constraint.validate('doctor', {
      property: 'value',
      constraints: [{ entity: DemoEntity, tenantScoped: true }],
    } as any)).resolves.toBe(true)

    expect(findOne).toHaveBeenCalledWith({
      where: {
        value: 'doctor',
        tenantId: 2,
      },
    })
  })

  it('fails closed when tenantScoped validation has no tenant context', async () => {
    const { constraint, findOne } = createConstraint()

    await expect(constraint.validate('doctor', {
      property: 'value',
      constraints: [{ entity: DemoEntity, tenantScoped: true }],
    } as any)).resolves.toBe(false)

    expect(findOne).not.toHaveBeenCalled()
  })

  it('excludes the current row during tenant-scoped updates', async () => {
    const { constraint, findOne } = createConstraint({ tenantId: 2, operateId: 9 })

    await expect(constraint.validate('doctor', {
      property: 'value',
      constraints: [{ entity: DemoEntity, tenantScoped: true }],
    } as any)).resolves.toBe(true)

    expect(findOne).toHaveBeenCalledWith({
      where: expect.objectContaining({
        value: 'doctor',
        tenantId: 2,
        id: expect.anything(),
      }),
    })
  })
})
