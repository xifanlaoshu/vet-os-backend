import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import Redis from 'ioredis'

import { isEmpty } from 'lodash'
import * as svgCaptcha from 'svg-captcha'
import { ApiResult } from '~/common/decorators/api-result.decorator'

import { InjectRedis } from '~/common/decorators/inject-redis.decorator'
import { envNumber, isDev } from '~/global/env'
import { genCaptchaImgKey } from '~/helper/genRedisKey'
import { generateUUID } from '~/utils'

import { Public } from '../decorators/public.decorator'

import { ImageCaptchaDto } from '../dto/captcha.dto'
import { ImageCaptcha } from '../models/auth.model'

const CAPTCHA_THROTTLE_LIMIT = envNumber('CAPTCHA_THROTTLER_LIMIT', isDev ? 60 : 20)
const CAPTCHA_THROTTLE_TTL = envNumber('CAPTCHA_THROTTLER_TTL', 60000)

@ApiTags('Captcha - 验证码模块')
@UseGuards(ThrottlerGuard)
@Controller('auth/captcha')
export class CaptchaController {
  constructor(@InjectRedis() private redis: Redis) {}

  @Get('img')
  @ApiOperation({ summary: '获取登录图片验证码' })
  @ApiResult({ type: ImageCaptcha })
  @Public()
  @Throttle({ default: { limit: CAPTCHA_THROTTLE_LIMIT, ttl: CAPTCHA_THROTTLE_TTL } })
  async captchaByImg(@Query() dto: ImageCaptchaDto): Promise<ImageCaptcha> {
    const { width, height } = dto

    const svg = svgCaptcha.create({
      size: 4,
      color: true,
      noise: 4,
      width: isEmpty(width) ? 100 : width,
      height: isEmpty(height) ? 50 : height,
      charPreset: '1234567890',
    })
    const result = {
      img: `data:image/svg+xml;base64,${Buffer.from(svg.data).toString(
        'base64',
      )}`,
      id: generateUUID(),
    }
    await this.redis.set(genCaptchaImgKey(result.id), svg.text, 'EX', 60 * 5)
    return result
  }
}
