import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'

import { Like, Repository } from 'typeorm'

import { paginate } from '~/helper/paginate'
import { Pagination } from '~/helper/paginate/pagination'
import { DictItemEntity } from '~/modules/system/dict-item/dict-item.entity'

import { DictItemDto, DictItemQueryDto } from './dict-item.dto'

@Injectable()
export class DictItemService {
  constructor(
    @InjectRepository(DictItemEntity)
    private dictItemRepository: Repository<DictItemEntity>,
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
    const queryBuilder = this.dictItemRepository.createQueryBuilder('dict_item').orderBy({ orderNo: 'ASC' }).where({
      tenantId: context?.tenantId ?? 1,
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
    await this.dictItemRepository.insert({
      tenantId: context?.tenantId ?? 1,
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
    await this.dictItemRepository.update({ id, tenantId: context?.tenantId ?? 1 }, {
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
    await this.dictItemRepository.delete({ id, tenantId: context?.tenantId ?? 1 })
  }

  /**
   * 查询单个
   */
  async findOne(id: number, context?: Pick<IAuthUser, 'tenantId'>): Promise<DictItemEntity> {
    return this.dictItemRepository.findOneBy({ id, tenantId: context?.tenantId ?? 1 })
  }
}
