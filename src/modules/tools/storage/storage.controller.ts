import { createReadStream } from 'node:fs'

import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { FastifyReply } from 'fastify'

import { ApiResult } from '~/common/decorators/api-result.decorator'
import { ApiSecurityAuth } from '~/common/decorators/swagger.decorator'

import { Pagination } from '~/helper/paginate/pagination'

import { AllowAnon } from '~/modules/auth/decorators/allow-anon.decorator'
import { AuthUser } from '~/modules/auth/decorators/auth-user.decorator'
import { definePermission, Perm } from '~/modules/auth/decorators/permission.decorator'

import { StorageDeleteDto, StoragePageDto } from './storage.dto'
import { StorageInfo } from './storage.modal'
import { StorageService } from './storage.service'

export const permissions = definePermission('tool:storage', {
  LIST: 'list',
  DELETE: 'delete',
} as const)

@ApiTags('Tools - 存储模块')
@ApiSecurityAuth()
@Controller('storage')
export class StorageController {
  constructor(private storageService: StorageService) {}

  @Get('list')
  @ApiOperation({ summary: '获取本地存储列表' })
  @ApiResult({ type: [StorageInfo], isPage: true })
  @Perm(permissions.LIST)
  async list(@Query() dto: StoragePageDto, @AuthUser() user: IAuthUser): Promise<Pagination<StorageInfo>> {
    return this.storageService.list(dto, user)
  }

  @Get('file/:token')
  @AllowAnon()
  @ApiOperation({ summary: 'Get protected uploaded file by opaque token' })
  async file(@Param('token') token: string, @Res() reply: FastifyReply) {
    const { storage, filePath, mimeType } = await this.storageService.getAuthorizedFileByToken(token)
    reply.header('Content-Type', mimeType)
    reply.header('Cache-Control', 'private, max-age=300')
    reply.header('X-Content-Type-Options', 'nosniff')
    reply.header('Content-Disposition', `inline; filename="${encodeURIComponent(storage.fileName || storage.name)}"`)
    return reply.send(createReadStream(filePath))
  }

  @ApiOperation({ summary: '删除文件' })
  @Post('delete')
  @Perm(permissions.DELETE)
  async delete(@Body() dto: StorageDeleteDto, @AuthUser() user: IAuthUser): Promise<void> {
    await this.storageService.delete(dto.ids, user)
  }
}
