import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import Redis from 'ioredis'

import { InjectRedis } from '~/common/decorators/inject-redis.decorator'
import { BusinessException } from '~/common/exceptions/biz.exception'
import { ISecurityConfig, SecurityConfig } from '~/config'
import { ErrorEnum } from '~/constants/error-code.constant'
import { genMfaSetupKey } from '~/helper/genRedisKey'
import { UserEntity } from '~/modules/user/user.entity'

import {
  buildTotpAuthUrl,
  decryptMfaSecret,
  encryptMfaSecret,
  generateTotpSecret,
  verifyTotpCode,
} from '../utils/mfa.util'

const MFA_SETUP_TTL_SECONDS = 10 * 60
const MFA_ISSUER = 'VET-OS'

@Injectable()
export class MfaService {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    @Inject(SecurityConfig.KEY) private readonly securityConfig: ISecurityConfig,
  ) {}

  async createSetup(user: IAuthUser) {
    const secret = generateTotpSecret()
    await this.redis.set(
      genMfaSetupKey(user.uid),
      this.encrypt(secret),
      'EX',
      MFA_SETUP_TTL_SECONDS,
    )
    return {
      secret,
      expiresIn: MFA_SETUP_TTL_SECONDS,
      otpauthUrl: buildTotpAuthUrl(secret, MFA_ISSUER, String(user.accountId ?? user.uid)),
    }
  }

  async enable(user: IAuthUser, code: string) {
    const encryptedSecret = await this.redis.get(genMfaSetupKey(user.uid))
    if (!encryptedSecret)
      throw new BadRequestException('MFA setup has expired. Please start setup again.')

    const secret = this.decrypt(encryptedSecret)
    if (!verifyTotpCode(secret, code))
      throw new BadRequestException('Invalid MFA code.')

    await UserEntity.update({ id: user.uid }, {
      mfaEnabled: true,
      mfaSecret: encryptedSecret,
    })
    await this.redis.del(genMfaSetupKey(user.uid))
  }

  async disable(user: IAuthUser, code: string) {
    const currentUser = await UserEntity.findOneBy({ id: user.uid })
    if (!currentUser)
      throw new BusinessException(ErrorEnum.USER_NOT_FOUND)

    if (!currentUser.mfaEnabled)
      return

    if (!currentUser.mfaSecret || !verifyTotpCode(this.decrypt(currentUser.mfaSecret), code))
      throw new BadRequestException('Invalid MFA code.')

    await UserEntity.update({ id: user.uid }, {
      mfaEnabled: false,
      mfaSecret: null,
    })
    await this.redis.del(genMfaSetupKey(user.uid))
  }

  assertLoginAllowed(user: Pick<UserEntity, 'mfaEnabled' | 'mfaSecret'>, code?: string) {
    if (!user.mfaEnabled)
      return

    if (!code || !user.mfaSecret || !verifyTotpCode(this.decrypt(user.mfaSecret), code))
      throw new BusinessException(ErrorEnum.INVALID_USERNAME_PASSWORD)
  }

  private encrypt(secret: string) {
    return encryptMfaSecret(secret, this.securityConfig.cookieSecret)
  }

  private decrypt(encryptedSecret: string) {
    return decryptMfaSecret(encryptedSecret, this.securityConfig.cookieSecret)
  }
}
