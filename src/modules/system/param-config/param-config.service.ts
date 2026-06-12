import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'

import { Repository } from 'typeorm'

import { paginate } from '~/helper/paginate'
import { Pagination } from '~/helper/paginate/pagination'
import { ParamConfigEntity } from '~/modules/system/param-config/param-config.entity'

import { ParamConfigDto, ParamConfigQueryDto } from './param-config.dto'

@Injectable()
export class ParamConfigService {
  constructor(
    @InjectRepository(ParamConfigEntity)
    private paramConfigRepository: Repository<ParamConfigEntity>,
  ) {}

  /**
   * 罗列所有配置
   */
  async page({
    page,
    pageSize,
    name,
  }: ParamConfigQueryDto, context?: Pick<IAuthUser, 'tenantId'>): Promise<Pagination<ParamConfigEntity>> {
    const queryBuilder = this.paramConfigRepository.createQueryBuilder('config')
      .where('config.tenantId = :tenantId', { tenantId: context?.tenantId ?? 1 })

    if (name) {
      queryBuilder.andWhere('config.name LIKE :name', {
        name: `%${name}%`,
      })
    }

    return paginate(queryBuilder, { page, pageSize })
  }

  /**
   * 获取参数总数
   */
  async countConfigList(): Promise<number> {
    return this.paramConfigRepository.count()
  }

  /**
   * 新增
   */
  async create(dto: ParamConfigDto, context?: Pick<IAuthUser, 'tenantId'>): Promise<void> {
    await this.paramConfigRepository.insert({ ...dto, tenantId: context?.tenantId ?? 1 })
  }

  /**
   * 更新
   */
  async update(id: number, dto: Partial<ParamConfigDto>, context?: Pick<IAuthUser, 'tenantId'>): Promise<void> {
    await this.paramConfigRepository.update({ id, tenantId: context?.tenantId ?? 1 }, dto)
  }

  /**
   * 删除
   */
  async delete(id: number, context?: Pick<IAuthUser, 'tenantId'>): Promise<void> {
    await this.paramConfigRepository.delete({ id, tenantId: context?.tenantId ?? 1 })
  }

  /**
   * 查询单个
   */
  async findOne(id: number, context?: Pick<IAuthUser, 'tenantId'>): Promise<ParamConfigEntity> {
    return this.paramConfigRepository.findOneBy({ id, tenantId: context?.tenantId ?? 1 })
  }

  async findValueByKey(key: string, context?: Pick<IAuthUser, 'tenantId'>): Promise<string | null> {
    const result = await this.paramConfigRepository.findOne({
      where: { key, tenantId: context?.tenantId ?? 1 },
      select: ['value'],
    })
    if (result)
      return result.value

    return null
  }
}
