import { stat } from 'node:fs/promises'
import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Between, In, Like, Repository } from 'typeorm'

import { requireTenantAreaContext } from '~/common/utils/tenant-context.util'
import { paginateRaw } from '~/helper/paginate'
import { PaginationTypeEnum } from '~/helper/paginate/interface'
import { Pagination } from '~/helper/paginate/pagination'
import { Storage } from '~/modules/tools/storage/storage.entity'
import { UserEntity } from '~/modules/user/user.entity'
import { deleteFile, resolveProtectedUploadPath } from '~/utils'

import { StorageCreateDto, StoragePageDto } from './storage.dto'
import { StorageInfo } from './storage.modal'

@Injectable()
export class StorageService {
  constructor(
    @InjectRepository(Storage)
    private storageRepository: Repository<Storage>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
  ) {}

  async create(dto: StorageCreateDto, user: IAuthUser): Promise<void> {
    const { tenantId, areaId } = requireTenantAreaContext(user)
    await this.storageRepository.save({
      ...dto,
      userId: user.uid,
      tenantId,
      areaId,
      scanStatus: 2,
    })
  }

  /**
   * 删除文件
   */
  async delete(fileIds: number[], context: Pick<IAuthUser, 'tenantId' | 'areaId'>): Promise<void> {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const items = await this.storageRepository.find({
      where: { id: In(fileIds), tenantId, areaId },
    })
    if (items.length !== fileIds.length)
      throw new BadRequestException('File not found or no permission')
    await this.storageRepository.delete({ id: In(fileIds), tenantId, areaId })

    items.forEach((el) => {
      deleteFile(el.diskPath || el.path)
    })
  }

  async getAuthorizedFileByToken(accessToken: string): Promise<{ storage: Storage, filePath: string, mimeType: string }> {
    const storage = await this.storageRepository.findOneBy({ accessToken, scanStatus: 2 })
    return this.resolveAuthorizedStorageFile(storage)
  }

  async getAuthorizedFileById(id: number, context: Pick<IAuthUser, 'tenantId' | 'areaId'>): Promise<{ storage: Storage, filePath: string, mimeType: string }> {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const storage = await this.storageRepository.findOneBy({ id, tenantId, areaId, scanStatus: 2 })
    return this.resolveAuthorizedStorageFile(storage)
  }

  async list({
    page,
    pageSize,
    name,
    type,
    size,
    extName,
    time,
    username,
    bizType,
    bizId,
  }: StoragePageDto, context: Pick<IAuthUser, 'tenantId' | 'areaId'>): Promise<Pagination<StorageInfo>> {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const queryBuilder = this.storageRepository
      .createQueryBuilder('storage')
      .leftJoinAndSelect('sys_user', 'user', 'storage.user_id = user.id')
      .where({
        ...(name && { name: Like(`%${name}%`) }),
        ...(type && { type }),
        ...(extName && { extName }),
        ...(size && { size: Between(size[0], size[1]) }),
        ...(time && { createdAt: Between(time[0], time[1]) }),
        ...(username && {
          userId: await (await this.userRepository.findOneBy({ username }))?.id,
        }),
        ...(bizType && { bizType }),
        ...(bizId && { bizId }),
        tenantId,
        areaId,
      })
      .orderBy('storage.created_at', 'DESC')

    const { items, ...rest } = await paginateRaw<Storage>(queryBuilder, {
      page,
      pageSize,
      paginationType: PaginationTypeEnum.LIMIT_AND_OFFSET,
    })

    function formatResult(result: Storage[]) {
      return result.map((e: any) => {
        return {
          id: e.storage_id,
          name: e.storage_name,
          extName: e.storage_ext_name,
          path: e.storage_path,
          bizType: e.storage_biz_type,
          bizId: e.storage_biz_id,
          scanStatus: e.storage_scan_status,
          type: e.storage_type,
          size: e.storage_size,
          createdAt: e.storage_created_at,
          username: e.user_username,
        }
      })
    }

    return {
      items: formatResult(items),
      ...rest,
    }
  }

  async count(context: Pick<IAuthUser, 'tenantId' | 'areaId'>): Promise<number> {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    return this.storageRepository.count({ where: { tenantId, areaId } })
  }

  private resolveMimeType(extName?: string | null) {
    const normalized = String(extName || '').toLowerCase()
    const mapping: Record<string, string> = {
      png: 'image/png',
      gif: 'image/gif',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      pdf: 'application/pdf',
    }
    return mapping[normalized] || 'application/octet-stream'
  }

  private async resolveAuthorizedStorageFile(storage?: Storage | null) {
    if (!storage?.diskPath)
      throw new BadRequestException('File not found')

    const filePath = resolveProtectedUploadPath(storage.diskPath)
    const fileStat = await stat(filePath).catch(() => null)
    if (!fileStat?.isFile())
      throw new BadRequestException('File not found')

    return {
      storage,
      filePath,
      mimeType: this.resolveMimeType(storage.extName),
    }
  }
}
