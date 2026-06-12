import { MailerService as NestMailerService } from '@nestjs-modules/mailer'

import { Inject, Injectable, Logger } from '@nestjs/common'
import dayjs from 'dayjs'

import Redis from 'ioredis'

import { InjectRedis } from '~/common/decorators/inject-redis.decorator'
import { BusinessException } from '~/common/exceptions/biz.exception'
import { AppConfig, IAppConfig } from '~/config'
import { ErrorEnum } from '~/constants/error-code.constant'
import { randomValue } from '~/utils'

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name)
  private readonly codeTtlSeconds = 60 * 5
  private readonly sendIntervalSeconds = 60
  private readonly dailyLimit = 5

  constructor(
    @Inject(AppConfig.KEY) private appConfig: IAppConfig,
    @InjectRedis() private redis: Redis,
    private mailerService: NestMailerService,
  ) {}

  async log(to: string, code: string, ip: string) {
    const recipient = this.normalizeRecipient(to)
    const clientIp = this.normalizeIp(ip)
    const remainSeconds = this.getRemainSecondsOfDay()
    const recipientDailyKey = this.recipientDailyLimitKey(recipient)
    const ipDailyKey = this.ipDailyLimitKey(clientIp)

    await this.redis.set(this.verificationCodeKey(recipient), code, 'EX', this.codeTtlSeconds)
    await this.redis.set(this.recipientIntervalKey(recipient), '1', 'EX', this.sendIntervalSeconds)
    await this.redis.set(this.ipIntervalKey(clientIp), '1', 'EX', this.sendIntervalSeconds)

    const [recipientDailyCount, ipDailyCount] = await Promise.all([
      this.redis.incr(recipientDailyKey),
      this.redis.incr(ipDailyKey),
    ])

    await Promise.all([
      recipientDailyCount === 1 ? this.redis.expire(recipientDailyKey, remainSeconds) : Promise.resolve(0),
      ipDailyCount === 1 ? this.redis.expire(ipDailyKey, remainSeconds) : Promise.resolve(0),
    ])
  }

  async checkCode(to: string, code: string) {
    const recipient = this.normalizeRecipient(to)
    const ret = await this.redis.get(this.verificationCodeKey(recipient))
    if (ret !== code)
      throw new BusinessException(ErrorEnum.INVALID_VERIFICATION_CODE)

    await this.redis.del(this.verificationCodeKey(recipient))
  }

  async checkLimit(to: string, ip: string) {
    const recipient = this.normalizeRecipient(to)
    const clientIp = this.normalizeIp(ip)

    const ipLimit = await this.redis.get(this.ipIntervalKey(clientIp))
    if (ipLimit)
      throw new BusinessException(ErrorEnum.TOO_MANY_REQUESTS)

    const recipientLimit = await this.redis.get(this.recipientIntervalKey(recipient))
    if (recipientLimit)
      throw new BusinessException(ErrorEnum.TOO_MANY_REQUESTS)

    const recipientDailyCount = Number(await this.redis.get(this.recipientDailyLimitKey(recipient)) ?? 0)
    if (recipientDailyCount >= this.dailyLimit)
      throw new BusinessException(ErrorEnum.MAXIMUM_FIVE_VERIFICATION_CODES_PER_DAY)

    const ipDailyCount = Number(await this.redis.get(this.ipDailyLimitKey(clientIp)) ?? 0)
    if (ipDailyCount >= this.dailyLimit)
      throw new BusinessException(ErrorEnum.MAXIMUM_FIVE_VERIFICATION_CODES_PER_DAY)
  }

  async send(
    to: string,
    subject: string,
    content: string,
    type: 'text' | 'html' = 'text',
  ): Promise<any> {
    if (type === 'text') {
      return this.mailerService.sendMail({
        to,
        subject,
        text: content,
      })
    }

    return this.mailerService.sendMail({
      to,
      subject,
      html: content,
    })
  }

  async sendVerificationCode(to: string, code = randomValue(4, '1234567890')) {
    const subject = `[${this.appConfig.name}] \u9A8C\u8BC1\u7801`

    try {
      await this.mailerService.sendMail({
        to,
        subject,
        template: './verification-code-zh',
        context: {
          code,
        },
      })
    }
    catch (error) {
      this.logger.warn(`Verification code email failed: ${error instanceof Error ? error.message : 'unknown error'}`)
      throw new BusinessException(ErrorEnum.VERIFICATION_CODE_SEND_FAILED)
    }

    return {
      to,
      code,
    }
  }

  private normalizeRecipient(to: string) {
    return String(to ?? '').trim().toLowerCase()
  }

  private normalizeIp(ip: string) {
    return String(ip ?? '').trim()
  }

  private verificationCodeKey(recipient: string) {
    return `captcha:${recipient}`
  }

  private recipientIntervalKey(recipient: string) {
    return `captcha:${recipient}:limit`
  }

  private recipientDailyLimitKey(recipient: string) {
    return `captcha:${recipient}:limit-day`
  }

  private ipIntervalKey(ip: string) {
    return `ip:${ip}:send:limit`
  }

  private ipDailyLimitKey(ip: string) {
    return `ip:${ip}:send:limit-day`
  }

  private getRemainSecondsOfDay() {
    const now = dayjs()
    return Math.max(now.endOf('day').diff(now, 'second'), this.codeTtlSeconds)
  }
}
