import { BadRequestException, Body, Controller, Get, Headers, Inject, Post, Req, Res, UseGuards } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { FastifyReply, FastifyRequest } from 'fastify'
import Redis from 'ioredis'

import { ApiResult } from '~/common/decorators/api-result.decorator'
import { Ip } from '~/common/decorators/http.decorator'
import { InjectRedis } from '~/common/decorators/inject-redis.decorator'
import { AppConfig, IAppConfig, ISecurityConfig, SecurityConfig } from '~/config'
import { genLoginFailKey, genLoginLockKey } from '~/helper/genRedisKey'

import { UserService } from '../user/user.service'

import { AuthService } from './auth.service'
import { Public } from './decorators/public.decorator'
import { LoginDto, RefreshTokenDto, RegisterDto } from './dto/auth.dto'
import { LocalGuard } from './guards/local.guard'
import { LoginToken } from './models/auth.model'
import { CaptchaService } from './services/captcha.service'
import {
  getRefreshTokenCookie,
  isValidCsrfRequest,
  setAuthSessionCookies,
  setCsrfCookie,
} from './utils/session-cookie.util'

@ApiTags('Auth - 认证模块')
@UseGuards(LocalGuard)
@Public()
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private userService: UserService,
    private captchaService: CaptchaService,
    @Inject(AppConfig.KEY) private readonly appConfig: IAppConfig,
    @Inject(SecurityConfig.KEY) private readonly securityConfig: ISecurityConfig,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  @Post('login')
  @ApiOperation({ summary: '登录' })
  @ApiResult({ type: LoginToken })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async login(
    @Body() dto: LoginDto,
    @Ip()ip: string,
    @Headers('user-agent')ua: string,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<LoginToken> {
    await this.captchaService.checkImgCaptcha(dto.captchaId, dto.verifyCode)
    await this.assertLoginNotLocked(dto.username, ip)
    try {
      const token = await this.authService.login(
        dto.username,
        dto.password,
        ip,
        ua,
        dto.mfaCode,
      )
      await this.clearLoginFailures(dto.username, ip)
      setAuthSessionCookies(reply, this.appConfig, this.securityConfig, token.refreshToken)
      return token
    }
    catch (error) {
      await this.recordLoginFailure(dto.username, ip)
      throw error
    }
  }

  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 3600000 } })
  @ApiOperation({ summary: '注册' })
  async register(@Body() dto: RegisterDto): Promise<void> {
    if (!this.appConfig.allowPublicRegister)
      throw new BadRequestException('当前环境未开放公开注册，请由平台或租户管理员创建账号')

    await this.userService.register(dto)
  }

  @Get('csrf')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Get CSRF token' })
  async csrf(@Res({ passthrough: true }) reply: FastifyReply) {
    const csrfToken = setCsrfCookie(reply, this.securityConfig)
    return { csrfToken }
  }

  @Post('refresh')
  @ApiOperation({ summary: '刷新访问令牌' })
  @ApiResult({ type: LoginToken })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<LoginToken> {
    const refreshToken = dto?.refreshToken || getRefreshTokenCookie(req)
    if (!refreshToken)
      throw new BadRequestException('Refresh token is required.')
    if (!dto?.refreshToken && !isValidCsrfRequest(req))
      throw new BadRequestException('Invalid CSRF token.')

    const token = await this.authService.refreshLoginToken(refreshToken)
    setAuthSessionCookies(reply, this.appConfig, this.securityConfig, token.refreshToken)
    return {
      token: token.accessToken,
      refreshToken: token.refreshToken,
    }
  }

  private getLoginIdentifiers(username: string, ip: string) {
    const account = username.trim().toLowerCase()
    return [`account:${account}`, `ip:${ip}`]
  }

  private async assertLoginNotLocked(username: string, ip: string) {
    const locked = await Promise.all(
      this.getLoginIdentifiers(username, ip).map(identifier => this.redis.ttl(genLoginLockKey(identifier))),
    )
    const maxTtl = Math.max(...locked)
    if (maxTtl > 0)
      throw new BadRequestException(`登录失败次数过多，请 ${Math.ceil(maxTtl / 60)} 分钟后再试`)
  }

  private async recordLoginFailure(username: string, ip: string) {
    const identifiers = this.getLoginIdentifiers(username, ip)
    await Promise.all(identifiers.map(async (identifier) => {
      const failKey = genLoginFailKey(identifier)
      const lockKey = genLoginLockKey(identifier)
      const attempts = await this.redis.incr(failKey)

      if (attempts === 1)
        await this.redis.expire(failKey, this.securityConfig.loginFailWindow)

      if (attempts >= this.securityConfig.loginFailLimit) {
        await this.redis.set(lockKey, '1', 'EX', this.securityConfig.loginLockSeconds)
        await this.redis.del(failKey)
      }
    }))
  }

  private async clearLoginFailures(username: string, ip: string) {
    const keys = this.getLoginIdentifiers(username, ip).flatMap(identifier => [
      genLoginFailKey(identifier),
      genLoginLockKey(identifier),
    ])
    await this.redis.del(keys)
  }
}
