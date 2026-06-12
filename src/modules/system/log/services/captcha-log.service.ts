import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'

import { LessThan, Repository } from 'typeorm'

import { paginate } from '~/helper/paginate'

import { CaptchaLogQueryDto } from '../dto/log.dto'
import { CaptchaLogEntity } from '../entities/captcha-log.entity'

@Injectable()
export class CaptchaLogService {
  constructor(
    @InjectRepository(CaptchaLogEntity)
    private captchaLogRepository: Repository<CaptchaLogEntity>,
  ) {}

  async create(
    account: string,
    code: string,
    provider: 'sms' | 'email',
    uid?: number,
  ): Promise<void> {
    await this.captchaLogRepository.save({
      account,
      code: this.maskCaptchaCode(code),
      provider,
      userId: uid,
    })
  }

  private maskCaptchaCode(code: string) {
    if (!code)
      return ''

    return `${'*'.repeat(Math.max(code.length - 1, 0))}${code.at(-1)}`
  }

  async paginate({ page, pageSize }: CaptchaLogQueryDto) {
    const queryBuilder = await this.captchaLogRepository
      .createQueryBuilder('captcha_log')
      .orderBy('captcha_log.id', 'DESC')

    return paginate<CaptchaLogEntity>(queryBuilder, {
      page,
      pageSize,
    })
  }

  async clearLog(): Promise<void> {
    await this.captchaLogRepository.clear()
  }

  async clearLogBeforeTime(time: Date): Promise<void> {
    await this.captchaLogRepository.delete({ createdAt: LessThan(time) })
  }
}
