import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { FastifyRequest } from 'fastify'

import { BusinessException } from '~/common/exceptions/biz.exception'
import { ErrorEnum } from '~/constants/error-code.constant'
import { AuthService } from '~/modules/auth/auth.service'

import { ALLOW_ANON_KEY, PERMISSION_KEY, PUBLIC_KEY, Roles } from '../auth.constant'

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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

    // AllowAnon still requires a valid login. Public endpoints do not.
    const allowAnon = this.reflector.getAllAndOverride<boolean>(ALLOW_ANON_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (allowAnon)
      return true

    const payloadPermission = this.reflector.getAllAndOverride<string | string[]>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    )

    // Public SaaS deployments must fail closed when access metadata is missing.
    if (!payloadPermission)
      throw new BusinessException(ErrorEnum.NO_PERMISSION)

    if (user.platformAdmin || user.roles.includes(Roles.ADMIN))
      return true

    const cachedPermissions = await this.authService.getPermissionsCache(user.uid)
    const allPermissions = cachedPermissions ?? await this.authService.getPermissions(user)
    if (!cachedPermissions)
      await this.authService.setPermissionsCache(user.uid, allPermissions)

    const canNext = Array.isArray(payloadPermission)
      ? payloadPermission.every(i => allPermissions.includes(i))
      : allPermissions.includes(payloadPermission)

    if (!canNext)
      throw new BusinessException(ErrorEnum.NO_PERMISSION)

    return true
  }
}
