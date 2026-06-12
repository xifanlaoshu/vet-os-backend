import { BusinessException } from '~/common/exceptions/biz.exception'

import { MailerService } from './mailer.service'

class RedisMock {
  private readonly store = new Map<string, string>()

  async get(key: string) {
    return this.store.get(key) ?? null
  }

  async set(key: string, value: string | number) {
    this.store.set(key, String(value))
  }

  async incr(key: string) {
    const next = Number(this.store.get(key) ?? 0) + 1
    this.store.set(key, String(next))
    return next
  }

  async expire() {
    return 1
  }

  async del(key: string) {
    this.store.delete(key)
  }
}

function createMailerService(redis = new RedisMock()) {
  return {
    redis,
    service: new MailerService(
      { name: 'VET-OS' } as any,
      redis as any,
      {
        sendMail: jest.fn().mockResolvedValue(undefined),
      } as any,
    ),
  }
}

describe('mailerService security limits', () => {
  it('normalizes recipient keys so email case cannot bypass interval limits', async () => {
    const { service } = createMailerService()

    await service.log('Owner@Example.COM', '1234', '203.0.113.10')

    await expect(service.checkLimit('owner@example.com', '203.0.113.11')).rejects.toBeInstanceOf(BusinessException)
  })

  it('blocks recipient after the daily verification-code limit is reached', async () => {
    const { service } = createMailerService()

    for (let index = 0; index < 5; index += 1)
      await service.log('owner@example.com', '1234', `203.0.113.${index + 1}`)

    await expect(service.checkLimit('owner@example.com', '203.0.113.100')).rejects.toBeInstanceOf(BusinessException)
  })

  it('blocks client ip after the daily verification-code limit is reached', async () => {
    const { service } = createMailerService()

    for (let index = 0; index < 5; index += 1)
      await service.log(`owner${index}@example.com`, '1234', '203.0.113.10')

    await expect(service.checkLimit('new-owner@example.com', '203.0.113.10')).rejects.toBeInstanceOf(BusinessException)
  })
})
