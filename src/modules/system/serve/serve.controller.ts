import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager'
import { Controller, ForbiddenException, Get, UseInterceptors } from '@nestjs/common'
import { ApiExtraModels, ApiOperation, ApiTags } from '@nestjs/swagger'

import { ApiResult } from '~/common/decorators/api-result.decorator'

import { ApiSecurityAuth } from '~/common/decorators/swagger.decorator'

import { AuthUser } from '~/modules/auth/decorators/auth-user.decorator'
import { definePermission, Perm } from '~/modules/auth/decorators/permission.decorator'

import { ServeStatInfo } from './serve.model'
import { ServeService } from './serve.service'

export const permissions = definePermission('system:serve', {
  STAT: 'stat',
} as const)

@ApiTags('System - 服务监控')
@ApiSecurityAuth()
@ApiExtraModels(ServeStatInfo)
@Controller('serve')
@UseInterceptors(CacheInterceptor)
@CacheKey('serve_stat')
@CacheTTL(10000)
export class ServeController {
  constructor(private serveService: ServeService) {}

  @Get('stat')
  @ApiOperation({ summary: '获取服务器运行信息' })
  @ApiResult({ type: ServeStatInfo })
  @Perm(permissions.STAT)
  async stat(@AuthUser() user: IAuthUser): Promise<ServeStatInfo> {
    this.assertPlatformAdmin(user)
    return this.serveService.getServeStat()
  }

  private assertPlatformAdmin(user: IAuthUser) {
    if (!user?.platformAdmin)
      throw new ForbiddenException('Server monitoring requires platform administrator privileges')
  }
}
