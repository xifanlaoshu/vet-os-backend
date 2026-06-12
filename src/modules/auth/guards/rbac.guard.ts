import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { FastifyRequest } from 'fastify'

import { BusinessException } from '~/common/exceptions/biz.exception'
import { AppConfig, IAppConfig } from '~/config'
import { ErrorEnum } from '~/constants/error-code.constant'
import { AuthService } from '~/modules/auth/auth.service'

import { ALLOW_ANON_KEY, PERMISSION_KEY, PUBLIC_KEY, Roles } from '../auth.constant'

function normalizeRequestPath(request: FastifyRequest) {
  const path = request.url.split('?')[0] || ''
  return path.replace(/^\/api(?=\/)/, '')
}

function isAuthenticatedPublicReadRoute(request: FastifyRequest) {
  if (request.method !== 'GET')
    return false

  const path = normalizeRequestPath(request)
  return [
    path === '/system/dict-type',
    path === '/system/dict-type/select-options',
    /^\/system\/dict-type\/\d+$/.test(path),
    path === '/system/dict-item',
    /^\/system\/dict-item\/\d+$/.test(path),
    path === '/system/serve/stat',
  ].some(Boolean)
}

@Injectable()
export class RbacGuard implements CanActivate {
  private readonly logger = new Logger(RbacGuard.name)

  constructor(
    private reflector: Reflector,
    private authService: AuthService,
    @Inject(AppConfig.KEY) private readonly appConfig: IAppConfig,
  ) {}

  async canActivate(context: ExecutionContext): Promise<any> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (isPublic)
      return true

    const request = context.switchToHttp().getRequest<FastifyRequest>()

    const { user } = request
    if (!user)
      throw new BusinessException(ErrorEnum.INVALID_LOGIN)

    // allowAnon 是需要登录后可访问(无需权限), Public 则是无需登录也可访问.
    const allowAnon = this.reflector.getAllAndOverride<boolean>(ALLOW_ANON_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (allowAnon || isAuthenticatedPublicReadRoute(request))
      return true

    const payloadPermission = this.reflector.getAllAndOverride<
      string | string[]
    >(PERMISSION_KEY, [context.getHandler(), context.getClass()])

    // 控制器没有设置接口权限，则默认通过
    if (!payloadPermission) {
      if (this.appConfig.strictRbac)
        throw new BusinessException(ErrorEnum.NO_PERMISSION)

      this.logger.warn(`Route ${request.method} ${normalizeRequestPath(request)} has no @Perm/@AllowAnon metadata; allowed only because STRICT_RBAC=false`)
      return true
    }

    // 管理员放开所有权限
    if (user.roles.includes(Roles.ADMIN))
      return true

    const cachedPermissions = await this.authService.getPermissionsCache(user.uid)
    const allPermissions = cachedPermissions ?? await this.authService.getPermissions(user.uid)
    if (!cachedPermissions)
      await this.authService.setPermissionsCache(user.uid, allPermissions)
    // console.log(allPermissions)
    let canNext = false

    // handle permission strings
    if (Array.isArray(payloadPermission)) {
      // 只要有一个权限满足即可
      canNext = payloadPermission.every(i => allPermissions.includes(i))
    }

    if (typeof payloadPermission === 'string')
      canNext = allPermissions.includes(payloadPermission)

    if (!canNext)
      throw new BusinessException(ErrorEnum.NO_PERMISSION)

    return true
  }
}
