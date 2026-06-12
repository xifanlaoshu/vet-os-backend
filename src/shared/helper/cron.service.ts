import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { CronExpression } from '@nestjs/schedule'
import { LessThan } from 'typeorm'

import { CronOnce } from '~/common/decorators/cron-once.decorator'
import { ConfigKeyPaths } from '~/config'
import { AccessTokenEntity } from '~/modules/auth/entities/access-token.entity'

@Injectable()
export class CronService {
  private logger: Logger = new Logger(CronService.name)

  constructor(
    private readonly configService: ConfigService<ConfigKeyPaths>,
  ) {}

  @CronOnce(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async deleteExpiredJWT() {
    this.logger.log('--> start scanning expired tokens')

    const expiredTokens = await AccessTokenEntity.find({
      where: {
        expired_at: LessThan(new Date()),
      },
    })

    let deleteCount = 0
    await Promise.all(
      expiredTokens.map(async (token) => {
        await AccessTokenEntity.remove(token)
        this.logger.debug(`--> deleted expired token record: ${token.id}`)
        deleteCount += 1
      }),
    )

    this.logger.log(`--> deleted ${deleteCount} expired token records`)
  }
}
