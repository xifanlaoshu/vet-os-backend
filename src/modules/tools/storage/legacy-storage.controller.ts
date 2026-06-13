import { createReadStream } from 'node:fs'

import { Controller, Get, Param, Res } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { FastifyReply } from 'fastify'

import { setProtectedFileResponseHeaders } from '~/common/utils/file-response.util'
import { Public } from '~/modules/auth/decorators/public.decorator'

import { StorageService } from './storage.service'

@ApiTags('Tools - Storage')
@Controller('storage')
export class LegacyStorageController {
  constructor(private readonly storageService: StorageService) {}

  @Get('file/:token')
  @Public()
  @ApiOperation({ summary: 'Get protected uploaded file by opaque token through legacy route' })
  async file(@Param('token') token: string, @Res() reply: FastifyReply) {
    const { storage, filePath, mimeType } = await this.storageService.getAuthorizedFileByToken(token)
    setProtectedFileResponseHeaders(reply, { mimeType, filename: storage.fileName || storage.name })
    return reply.send(createReadStream(filePath))
  }
}
