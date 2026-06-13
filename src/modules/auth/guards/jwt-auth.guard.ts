import {
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthGuard } from '@nestjs/passport'
import { FastifyRequest } from 'fastify'
import Redis from 'ioredis'
import { isEmpty, isNil } from 'lodash'
import { ClsService } from 'nestjs-cls'
import { ExtractJwt } from 'passport-jwt'

import { InjectRedis } from '~/common/decorators/inject-redis.decorator'
import { BusinessException } from '~/common/exceptions/biz.exception'
import { AppConfig, IAppConfig, RouterWhiteList } from '~/config'
import { ErrorEnum } from '~/constants/error-code.constant'
import { genTokenBlacklistKey } from '~/helper/genRedisKey'
import { AuthService } from '~/modules/auth/auth.service'
import { TenantService } from '~/modules/system/tenant/tenant.service'
import { checkIsDemoMode } from '~/utils'

import { AuthStrategy, PUBLIC_KEY } from '../auth.constant'
import { TokenService } from '../services/token.service'

interface RequestType {
  Params: {
    uid?: string
  }
}

@Injectable()
export class JwtAuthGuard extends AuthGuard(AuthStrategy.JWT) {
  jwtFromRequestFn = ExtractJwt.fromAuthHeaderAsBearerToken()

  constructor(
    private reflector: Reflector,
    private authService: AuthService,
    private tokenService: TokenService,
    private tenantService: TenantService,
    @InjectRedis() private readonly redis: Redis,
    @Inject(AppConfig.KEY) private appConfig: IAppConfig,
    private readonly cls: ClsService,
  ) {
    super()
  }

  async canActivate(context: ExecutionContext): Promise<any> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    const request = context.switchToHttp().getRequest<FastifyRequest<RequestType>>()

    if (RouterWhiteList.includes(request.routeOptions.url))
      return true

    if (request.method !== 'GET' && !request.url.includes('/auth/login'))
      checkIsDemoMode()

    const isSse = request.headers.accept === 'text/event-stream'

    const token = this.jwtFromRequestFn(request)
    if (token && await this.redis.get(genTokenBlacklistKey(token)))
      throw new BusinessException(ErrorEnum.INVALID_LOGIN)

    if (token)
      request.accessToken = token

    let result: any = false
    try {
      result = await super.canActivate(context)
    }
    catch (err) {
      if (isPublic)
        return true

      if (isEmpty(token))
        throw new UnauthorizedException('未登录')

      if (err instanceof UnauthorizedException)
        throw new BusinessException(ErrorEnum.INVALID_LOGIN)

      const isValid = isNil(token)
        ? undefined
        : await this.tokenService.checkAccessToken(token!)

      if (!isValid)
        throw new BusinessException(ErrorEnum.INVALID_LOGIN)
    }

    if (token) {
      const isValid = await this.tokenService.checkAccessToken(token)
      if (!isValid)
        throw new BusinessException(ErrorEnum.INVALID_LOGIN)
    }

    if (isSse) {
      const { uid } = request.params
      if (Number(uid) !== request.user.uid)
        throw new UnauthorizedException('路径参数 uid 与当前 token 登录用户 uid 不一致')
    }

    const pv = await this.authService.getPasswordVersionByUid(request.user.uid)
    if (pv !== `${request.user.pv}`)
      throw new BusinessException(ErrorEnum.INVALID_LOGIN)

    const contextUser = await this.tenantService.resolveRequestContext(
      request.user,
      request.headers['x-area-id'],
    )
    request.user = {
      ...request.user,
      ...contextUser,
    }
    this.setTenantContext(request.user.tenantId, request.user.areaId)

    if (!this.appConfig.multiDeviceLogin) {
      const cacheToken = await this.authService.getTokenByUid(request.user.uid)
      if (token !== cacheToken)
        throw new BusinessException(ErrorEnum.ACCOUNT_LOGGED_IN_ELSEWHERE)
    }

    return result
  }

  handleRequest(err, user) {
    if (err || !user)
      throw err || new UnauthorizedException()

    return user
  }

  private setTenantContext(tenantId: number, areaId: number) {
    const writeContext = () => {
      ;(this.cls as any).set('tenantId', tenantId)
      ;(this.cls as any).set('areaId', areaId)
    }

    if (this.cls.isActive())
      return writeContext()

    return this.cls.run({ ifNested: 'reuse' }, writeContext)
  }
}
