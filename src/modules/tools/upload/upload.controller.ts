import { BadRequestException, Controller, Logger, Post, Req } from '@nestjs/common'
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'
import { FastifyRequest } from 'fastify'

import { ApiSecurityAuth } from '~/common/decorators/swagger.decorator'
import { AuthUser } from '~/modules/auth/decorators/auth-user.decorator'

import { definePermission, Perm } from '~/modules/auth/decorators/permission.decorator'

import { FileUploadDto } from './upload.dto'
import { UploadService } from './upload.service'

export const permissions = definePermission('upload', {
  UPLOAD: 'upload',
} as const)

@ApiSecurityAuth()
@ApiTags('Tools - 上传模块')
@Controller('upload')
export class UploadController {
  private readonly logger = new Logger(UploadController.name)

  constructor(private uploadService: UploadService) {}

  @Post()
  @Perm(permissions.UPLOAD)
  @ApiOperation({ summary: '上传' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    type: FileUploadDto,
  })
  async upload(@Req() req: FastifyRequest, @AuthUser() user: IAuthUser) {
    if (!req.isMultipart())
      throw new BadRequestException('Request is not multipart')

    const file = await req.file()

    // https://github.com/fastify/fastify-multipart
    // const parts = req.files()
    // for await (const part of parts)
    //   console.log(part.file)

    try {
      const result = await this.uploadService.saveFile(file, user)

      return {
        filename: result.path,
        path: result.path,
        fileId: result.id,
        tokenExpiresAt: result.tokenExpiresAt,
      }
    }
    catch (error) {
      this.logger.warn(`File upload rejected: ${error instanceof Error ? error.message : 'unknown error'}`)
      throw new BadRequestException('上传失败')
    }
  }
}
