import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'

import { Repository } from 'typeorm'

import { requireTenantContext } from '~/common/utils/tenant-context.util'
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
    const { tenantId } = requireTenantContext(context)
    const queryBuilder = this.paramConfigRepository.createQueryBuilder('config')
      .where('config.tenantId = :tenantId', { tenantId })

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
    const { tenantId } = requireTenantContext(context)
    await this.paramConfigRepository.insert({ ...dto, tenantId })
  }

  /**
   * 更新
   */
  async update(id: number, dto: Partial<ParamConfigDto>, context?: Pick<IAuthUser, 'tenantId'>): Promise<void> {
    const { tenantId } = requireTenantContext(context)
    await this.paramConfigRepository.update({ id, tenantId }, dto)
  }

  /**
   * 删除
   */
  async delete(id: number, context?: Pick<IAuthUser, 'tenantId'>): Promise<void> {
    const { tenantId } = requireTenantContext(context)
    await this.paramConfigRepository.delete({ id, tenantId })
  }

  /**
   * 查询单个
   */
  async findOne(id: number, context?: Pick<IAuthUser, 'tenantId'>): Promise<ParamConfigEntity> {
    const { tenantId } = requireTenantContext(context)
    return this.paramConfigRepository.findOneBy({ id, tenantId })
  }

  async findValueByKey(key: string, context?: Pick<IAuthUser, 'tenantId'>): Promise<string | null> {
    const { tenantId } = requireTenantContext(context)
    const result = await this.paramConfigRepository.findOne({
      where: { key, tenantId },
      select: ['value'],
    })
    if (result)
      return result.value

    return null
  }
}
