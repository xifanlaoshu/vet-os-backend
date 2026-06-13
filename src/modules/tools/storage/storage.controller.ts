import { createReadStream } from 'node:fs'

import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { FastifyReply } from 'fastify'

import { ApiResult } from '~/common/decorators/api-result.decorator'
import { ApiSecurityAuth } from '~/common/decorators/swagger.decorator'
import { setProtectedFileResponseHeaders } from '~/common/utils/file-response.util'

import { Pagination } from '~/helper/paginate/pagination'

import { AuthUser } from '~/modules/auth/decorators/auth-user.decorator'
import { definePermission, Perm } from '~/modules/auth/decorators/permission.decorator'
import { Public } from '~/modules/auth/decorators/public.decorator'

import { StorageDeleteDto, StoragePageDto } from './storage.dto'
import { StorageInfo } from './storage.modal'
import { StorageService } from './storage.service'

export const permissions = definePermission('tool:storage', {
  LIST: 'list',
  READ: 'read',
  SIGN: 'sign',
  DELETE: 'delete',
} as const)

@ApiTags('Tools - Storage')
@ApiSecurityAuth()
@Controller('storage')
export class StorageController {
  constructor(private storageService: StorageService) {}

  @Get('list')
  @ApiOperation({ summary: 'List stored files' })
  @ApiResult({ type: [StorageInfo], isPage: true })
  @Perm(permissions.LIST)
  async list(@Query() dto: StoragePageDto, @AuthUser() user: IAuthUser): Promise<Pagination<StorageInfo>> {
    return this.storageService.list(dto, user)
  }

  @Get('file/:token')
  @Public()
  @ApiOperation({ summary: 'Get protected uploaded file by opaque token' })
  async file(@Param('token') token: string, @Res() reply: FastifyReply) {
    const { storage, filePath, mimeType } = await this.storageService.getAuthorizedFileByToken(token)
    setProtectedFileResponseHeaders(reply, { mimeType, filename: storage.fileName || storage.name })
    return reply.send(createReadStream(filePath))
  }

  @Get('file/id/:id')
  @Perm(permissions.READ)
  @ApiOperation({ summary: 'Get protected uploaded file by id with tenant and area authorization' })
  async authorizedFile(@Param('id') id: string, @AuthUser() user: IAuthUser, @Res() reply: FastifyReply) {
    const { storage, filePath, mimeType } = await this.storageService.getAuthorizedFileById(Number(id), user)
    setProtectedFileResponseHeaders(reply, { mimeType, filename: storage.fileName || storage.name })
    return reply.send(createReadStream(filePath))
  }

  @Post('file/:token/refresh')
  @Perm(permissions.SIGN)
  @ApiOperation({ summary: 'Refresh protected uploaded file preview token' })
  async refreshFileToken(@Param('token') token: string, @AuthUser() user: IAuthUser) {
    return this.storageService.refreshAnonymousToken(token, user)
  }

  @Post('file/id/:id/refresh')
  @Perm(permissions.SIGN)
  @ApiOperation({ summary: 'Refresh protected uploaded file preview token by storage id' })
  async refreshFileTokenById(@Param('id') id: string, @AuthUser() user: IAuthUser) {
    return this.storageService.refreshAnonymousTokenById(Number(id), user)
  }

  @Post('delete')
  @Perm(permissions.DELETE)
  @ApiOperation({ summary: 'Delete stored files' })
  async delete(@Body() dto: StorageDeleteDto, @AuthUser() user: IAuthUser): Promise<void> {
    await this.storageService.delete(dto.ids, user)
  }
}
