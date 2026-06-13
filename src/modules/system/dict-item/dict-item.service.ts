import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'

import { Like, Repository } from 'typeorm'

import { requireTenantContext } from '~/common/utils/tenant-context.util'
import { paginate } from '~/helper/paginate'
import { Pagination } from '~/helper/paginate/pagination'
import { DictItemEntity } from '~/modules/system/dict-item/dict-item.entity'
import { DictTypeEntity } from '~/modules/system/dict-type/dict-type.entity'

import { DictItemDto, DictItemQueryDto } from './dict-item.dto'

@Injectable()
export class DictItemService {
  constructor(
    @InjectRepository(DictItemEntity)
    private dictItemRepository: Repository<DictItemEntity>,
    @InjectRepository(DictTypeEntity)
    private dictTypeRepository: Repository<DictTypeEntity>,
  ) {}

  /**
   * 罗列所有配置
   */
  async page({
    page,
    pageSize,
    label,
    value,
    typeId,
  }: DictItemQueryDto, context?: Pick<IAuthUser, 'tenantId'>): Promise<Pagination<DictItemEntity>> {
    const { tenantId } = requireTenantContext(context)
    await this.assertTypeInTenant(typeId, tenantId)
    const queryBuilder = this.dictItemRepository.createQueryBuilder('dict_item').orderBy({ orderNo: 'ASC' }).where({
      tenantId,
      ...(label && { label: Like(`%${label}%`) }),
      ...(value && { value: Like(`%${value}%`) }),
      type: {
        id: typeId,
      },
    })

    return paginate(queryBuilder, { page, pageSize })
  }

  /**
   * 获取参数总数
   */
  async countConfigList(): Promise<number> {
    return this.dictItemRepository.count()
  }

  /**
   * 新增
   */
  async create(dto: DictItemDto, context?: Pick<IAuthUser, 'tenantId'>): Promise<void> {
    const { typeId, ...rest } = dto
    const { tenantId } = requireTenantContext(context)
    await this.assertTypeInTenant(typeId, tenantId)
    await this.dictItemRepository.insert({
      tenantId,
      ...rest,
      type: {
        id: typeId,
      },
    })
  }

  /**
   * 更新
   */
  async update(id: number, dto: Partial<DictItemDto>, context?: Pick<IAuthUser, 'tenantId'>): Promise<void> {
    const { typeId, ...rest } = dto
    const { tenantId } = requireTenantContext(context)
    await this.assertTypeInTenant(typeId, tenantId)
    await this.dictItemRepository.update({ id, tenantId }, {
      ...rest,
      type: {
        id: typeId,
      },
    })
  }

  /**
   * 删除
   */
  async delete(id: number, context?: Pick<IAuthUser, 'tenantId'>): Promise<void> {
    const { tenantId } = requireTenantContext(context)
    await this.dictItemRepository.delete({ id, tenantId })
  }

  /**
   * 查询单个
   */
  async findOne(id: number, context?: Pick<IAuthUser, 'tenantId'>): Promise<DictItemEntity> {
    const { tenantId } = requireTenantContext(context)
    return this.dictItemRepository.findOneBy({ id, tenantId })
  }

  private async assertTypeInTenant(typeId: number, tenantId: number) {
    if (!Number.isFinite(Number(typeId)))
      throw new BadRequestException('Dictionary type is required')

    const type = await this.dictTypeRepository.findOneBy({ id: Number(typeId), tenantId })
    if (!type)
      throw new BadRequestException('Dictionary type not found in current tenant')
  }
}
