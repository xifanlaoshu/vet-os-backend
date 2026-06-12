import { MultipartFile } from '@fastify/multipart'
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import dayjs from 'dayjs'
import { isNil } from 'lodash'
import { Repository } from 'typeorm'

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
  async saveFile(file: MultipartFile, userId: number): Promise<string> {
    if (isNil(file))
      throw new NotFoundException('Have not any file to upload!')

    const fileName = file.filename
    const extName = getExtname(fileName)
    const normalizedExtName = extName.toLowerCase()

    if (!this.allowedExtensions.has(normalizedExtName) || !this.allowedMimeTypes.has(file.mimetype))
      throw new BadRequestException('Unsupported file type')

    const buffer = await file.toBuffer()
    if (buffer.length > this.maxFileSize)
      throw new BadRequestException('File size exceeds the upload limit')

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
      userId,
    })

    return path
  }
}
