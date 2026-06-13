import { BadRequestException } from '@nestjs/common'

import { MemberService } from './member.service'

function createMemberService(overrides: {
  cardRepository?: any
  logRepository?: any
  customerRepository?: any
  dataSource?: any
} = {}) {
  return new MemberService(
    overrides.cardRepository ?? {} as any,
    overrides.logRepository ?? {} as any,
    overrides.customerRepository ?? {} as any,
    overrides.dataSource ?? {} as any,
  ) as any
}

function createLockedCardTransaction(card: any) {
  const qb: any = {
    setLock: jest.fn(() => qb),
    where: jest.fn(() => qb),
    andWhere: jest.fn(() => qb),
    getOne: jest.fn(async () => card),
  }
  const saveCard = jest.fn(async (value: any) => value)
  const saveLog = jest.fn(async (value: any) => value)
  const createLog = jest.fn((value: any) => value)
  const dataSource = {
    transaction: jest.fn(async (callback: any) => callback({
      getRepository: jest.fn((entity: any) => {
        if (entity.name === 'MemberCardEntity') {
          return {
            createQueryBuilder: jest.fn(() => qb),
            save: saveCard,
          }
        }
        return {
          create: createLog,
          save: saveLog,
        }
      }),
    })),
  }
  return { dataSource, qb, saveCard, createLog, saveLog }
}

describe('memberService card balance transaction safety', () => {
  it('locks member cards when recharging and writes balance snapshots', async () => {
    const card = { id: 9, status: 1, balance: 100, totalRecharge: 100 }
    const { dataSource, qb, saveCard, saveLog } = createLockedCardTransaction(card)
    const service = createMemberService({ dataSource })

    await service.recharge(9, { amount: 50, operatorId: 31 }, { tenantId: 2, areaId: 3 })

    expect(qb.setLock).toHaveBeenCalledWith('pessimistic_write')
    expect(qb.where).toHaveBeenCalledWith('card.id = :cardId', { cardId: 9 })
    expect(qb.andWhere).toHaveBeenCalledWith('card.tenantId = :tenantId', { tenantId: 2 })
    expect(saveCard).toHaveBeenCalledWith(expect.objectContaining({
      balance: 150,
      totalRecharge: 150,
    }))
    expect(saveLog).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 2,
      areaId: 3,
      cardId: 9,
      type: 1,
      direction: 1,
      balanceBefore: 100,
      balanceAfter: 150,
    }))
  })

  it('locks member cards when deducting and rejects insufficient balance without mutation', async () => {
    const card = { id: 9, status: 1, balance: 20, totalSpend: 0 }
    const { dataSource, qb, saveCard, saveLog } = createLockedCardTransaction(card)
    const service = createMemberService({ dataSource })

    await expect(service.deduct(9, { amount: 50 }, { tenantId: 2, areaId: 3 }))
      .rejects
      .toBeInstanceOf(BadRequestException)

    expect(qb.setLock).toHaveBeenCalledWith('pessimistic_write')
    expect(saveCard).not.toHaveBeenCalled()
    expect(saveLog).not.toHaveBeenCalled()
  })

  it('rejects zero or negative member card balance operations before opening a transaction', async () => {
    const dataSource = { transaction: jest.fn() }
    const service = createMemberService({ dataSource })

    await expect(service.recharge(9, { amount: 0 }, { tenantId: 2, areaId: 3 })).rejects.toBeInstanceOf(BadRequestException)
    await expect(service.deduct(9, { amount: 0 }, { tenantId: 2, areaId: 3 })).rejects.toBeInstanceOf(BadRequestException)
    expect(dataSource.transaction).not.toHaveBeenCalled()
  })
})
