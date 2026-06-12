import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'

import { Like, Repository } from 'typeorm'

import { requireTenantContext } from '~/common/utils/tenant-context.util'
import { paginate } from '~/helper/paginate'
import { Pagination } from '~/helper/paginate/pagination'
import { DictTypeEntity } from '~/modules/system/dict-type/dict-type.entity'

import { DictTypeDto, DictTypeQueryDto } from './dict-type.dto'

@Injectable()
export class DictTypeService {
  constructor(
    @InjectRepository(DictTypeEntity)
    private dictTypeRepository: Repository<DictTypeEntity>,
  ) {}

  /**
   * 罗列所有配置
   */
  async page({
    page,
    pageSize,
    name,
    code,
  }: DictTypeQueryDto, context?: Pick<IAuthUser, 'tenantId'>): Promise<Pagination<DictTypeEntity>> {
    const { tenantId } = requireTenantContext(context)
    const queryBuilder = this.dictTypeRepository.createQueryBuilder('dict_type').where({
      tenantId,
      ...(name && { name: Like(`%${name}%`) }),
      ...(code && { code: Like(`%${code}%`) }),
    })

    return paginate(queryBuilder, { page, pageSize })
  }

  /** 一次性获取所有的字典类型 */
  async getAll(context?: Pick<IAuthUser, 'tenantId'>) {
    const { tenantId } = requireTenantContext(context)
    return this.dictTypeRepository.find({ where: { tenantId } })
  }

  /**
   * 获取参数总数
   */
  async countConfigList(): Promise<number> {
    return this.dictTypeRepository.count()
  }

  /**
   * 新增
   */
  async create(dto: DictTypeDto, context?: Pick<IAuthUser, 'tenantId'>): Promise<void> {
    const { tenantId } = requireTenantContext(context)
    await this.dictTypeRepository.insert({ ...dto, tenantId })
  }

  /**
   * 更新
   */
  async update(id: number, dto: Partial<DictTypeDto>, context?: Pick<IAuthUser, 'tenantId'>): Promise<void> {
    const { tenantId } = requireTenantContext(context)
    await this.dictTypeRepository.update({ id, tenantId }, dto)
  }

  /**
   * 删除
   */
  async delete(id: number, context?: Pick<IAuthUser, 'tenantId'>): Promise<void> {
    const { tenantId } = requireTenantContext(context)
    await this.dictTypeRepository.delete({ id, tenantId })
  }

  /**
   * 查询单个
   */
  async findOne(id: number, context?: Pick<IAuthUser, 'tenantId'>): Promise<DictTypeEntity> {
    const { tenantId } = requireTenantContext(context)
    return this.dictTypeRepository.findOneBy({ id, tenantId })
  }
}
