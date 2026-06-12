import { MultipartFile } from '@fastify/multipart'
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import dayjs from 'dayjs'
import { isNil } from 'lodash'
import { Repository } from 'typeorm'

import { requireTenantAreaContext } from '~/common/utils/tenant-context.util'
import { Storage } from '~/modules/tools/storage/storage.entity'

import {
  fileRename,
  getExtname,
  getFilePath,
  getFileType,
  getSize,
  saveLocalFile,
} from '~/utils/file.util'

@Injectable()
export class UploadService {
  private readonly extensionMimeTypes = new Map<string, string[]>([
    ['png', ['image/png']],
    ['gif', ['image/gif']],
    ['jpg', ['image/jpeg']],
    ['jpeg', ['image/jpeg']],
    ['webp', ['image/webp']],
    ['mp4', ['video/mp4']],
    ['mov', ['video/quicktime']],
    ['pdf', ['application/pdf']],
  ])

  private readonly allowedMimeTypes = new Set([
    'image/png',
    'image/gif',
    'image/jpeg',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'application/pdf',
  ])

  private readonly allowedExtensions = new Set(['png', 'gif', 'jpg', 'jpeg', 'webp', 'mp4', 'mov', 'pdf'])

  private readonly maxFileSize = 1024 * 1024 * 100

  constructor(
    @InjectRepository(Storage)
    private storageRepository: Repository<Storage>,
  ) {}

  /**
   * 保存文件上传记录
   */
  async saveFile(file: MultipartFile, user: IAuthUser): Promise<string> {
    if (isNil(file))
      throw new NotFoundException('Have not any file to upload!')
    const { tenantId, areaId } = requireTenantAreaContext(user)

    const fileName = file.filename
    const extName = getExtname(fileName)
    const normalizedExtName = extName.toLowerCase()

    if (!this.allowedExtensions.has(normalizedExtName) || !this.allowedMimeTypes.has(file.mimetype))
      throw new BadRequestException('Unsupported file type')

    const buffer = await file.toBuffer()
    if (buffer.length > this.maxFileSize)
      throw new BadRequestException('File size exceeds the upload limit')
    if (!this.matchesDeclaredFileType(buffer, normalizedExtName, file.mimetype))
      throw new BadRequestException('File content does not match the declared file type')

    const size = getSize(buffer.length)
    const type = getFileType(extName)
    const name = fileRename(fileName)
    const currentDate = dayjs().format('YYYY-MM-DD')
    const path = getFilePath(name, currentDate, type)

    saveLocalFile(buffer, name, currentDate, type)

    await this.storageRepository.save({
      name,
      fileName,
      extName,
      path,
      type,
      size,
      userId: user.uid,
      tenantId,
      areaId,
    })

    return path
  }

  private matchesDeclaredFileType(buffer: Buffer, extName: string, mimeType: string) {
    if (!this.extensionMimeTypes.get(extName)?.includes(mimeType))
      return false

    switch (extName) {
      case 'png':
        return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))
      case 'gif':
        return ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'))
      case 'jpg':
      case 'jpeg':
        return buffer.length > 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF
      case 'webp':
        return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
      case 'pdf':
        return buffer.subarray(0, 4).toString('ascii') === '%PDF'
      case 'mp4':
      case 'mov':
        return buffer.length > 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp'
      default:
        return false
    }
  }
}
