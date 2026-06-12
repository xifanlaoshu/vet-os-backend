import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { FastifyRequest } from 'fastify'

import { BusinessException } from '~/common/exceptions/biz.exception'
import { ErrorEnum } from '~/constants/error-code.constant'
import { TenantService } from '~/modules/system/tenant/tenant.service'

import { PUBLIC_KEY } from '../auth.constant'

function normalizeRequestPath(request: FastifyRequest) {
  const path = request.url.split('?')[0] || ''
  return path.replace(/^\/api(?=\/)/, '')
}

function isReadRequest(request: FastifyRequest) {
  return ['GET', 'HEAD', 'OPTIONS'].includes(request.method)
}

function isContextBootstrapRoute(request: FastifyRequest) {
  const path = normalizeRequestPath(request)
  const bootstrapRoutes = new Set([
    '/account/profile',
    '/account/logout',
    '/account/context',
    '/account/select-context',
    '/account/switch-area',
    '/tenants/context',
  ])
  return bootstrapRoutes.has(path)
}

@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tenantService: TenantService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic)
      return true

    const request = context.switchToHttp().getRequest<FastifyRequest>()
    const user = request.user
    if (!user)
      return true

    if (!user.contextSelected && !isContextBootstrapRoute(request))
      throw new BusinessException(ErrorEnum.NO_PERMISSION)

    if (!isReadRequest(request))
      await this.tenantService.assertContextWritable(user)

    return true
  }
}
