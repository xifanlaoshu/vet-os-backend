import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm'
import { isEmpty } from 'lodash'
import { EntityManager, Like, Repository, TreeRepository } from 'typeorm'

import { BusinessException } from '~/common/exceptions/biz.exception'
import { requireTenantContext } from '~/common/utils/tenant-context.util'
import { ErrorEnum } from '~/constants/error-code.constant'
import { DeptEntity } from '~/modules/system/dept/dept.entity'
import { UserEntity } from '~/modules/user/user.entity'

import { deleteEmptyChildren, list2Tree } from '~/utils/list2tree.util'

import { DeptDto, DeptQueryDto, MoveDept } from './dept.dto'

@Injectable()
export class DeptService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(DeptEntity)
    private deptRepository: TreeRepository<DeptEntity>,
    @InjectEntityManager() private entityManager: EntityManager,
  ) {}

  async list(context?: Pick<IAuthUser, 'tenantId'>): Promise<DeptEntity[]> {
    const { tenantId } = requireTenantContext(context)
    return this.deptRepository.find({ where: { tenantId }, order: { orderNo: 'DESC' } })
  }

  async info(id: number, context?: Pick<IAuthUser, 'tenantId'>): Promise<DeptEntity> {
    const { tenantId } = requireTenantContext(context)
    const dept = await this.deptRepository
      .createQueryBuilder('dept')
      .leftJoinAndSelect('dept.parent', 'parent')
      .where('dept.id = :id', { id })
      .andWhere('dept.tenantId = :tenantId', { tenantId })
      .getOne()

    if (isEmpty(dept))
      throw new BusinessException(ErrorEnum.DEPARTMENT_NOT_FOUND)

    return dept
  }

  async create({ parentId, ...data }: DeptDto, context?: Pick<IAuthUser, 'tenantId'>): Promise<void> {
    const { tenantId } = requireTenantContext(context)
    const parent = parentId
      ? await this.deptRepository.findOneBy({ id: parentId, tenantId })
      : null
    if (parentId && !parent)
      throw new BusinessException(ErrorEnum.DEPARTMENT_NOT_FOUND)

    await this.deptRepository.save({
      ...data,
      tenantId,
      parent,
    })
  }

  async update(id: number, { parentId, ...data }: DeptDto, context?: Pick<IAuthUser, 'tenantId'>): Promise<void> {
    const { tenantId } = requireTenantContext(context)
    const item = await this.deptRepository.findOneBy({ id, tenantId })
    if (!item)
      throw new BusinessException(ErrorEnum.DEPARTMENT_NOT_FOUND)
    if (parentId && Number(parentId) === Number(id))
      throw new BadRequestException('Department parent cannot be itself')

    const parent = parentId
      ? await this.deptRepository.findOneBy({ id: parentId, tenantId })
      : null
    if (parentId && !parent)
      throw new BusinessException(ErrorEnum.DEPARTMENT_NOT_FOUND)

    await this.deptRepository.save({
      ...item,
      ...data,
      parent,
    })
  }

  async delete(id: number, context?: Pick<IAuthUser, 'tenantId'>): Promise<void> {
    const { tenantId } = requireTenantContext(context)
    await this.deptRepository.delete({ id, tenantId })
  }

  /**
   * 移动排序
   */
  async move(depts: MoveDept[]): Promise<void> {
    await this.entityManager.transaction(async (manager) => {
      await manager.save(depts)
    })
  }

  /**
   * 根据部门查询关联的用户数量
   */
  async countUserByDeptId(id: number, context?: Pick<IAuthUser, 'tenantId'>): Promise<number> {
    const { tenantId } = requireTenantContext(context)
    return this.userRepository.countBy({ tenantId, dept: { id } })
  }

  /**
   * 查找当前部门下的子部门数量
   */
  async countChildDept(id: number, context?: Pick<IAuthUser, 'tenantId'>): Promise<number> {
    const { tenantId } = requireTenantContext(context)
    const item = await this.deptRepository.findOneBy({ id, tenantId })
    if (!item)
      throw new BusinessException(ErrorEnum.DEPARTMENT_NOT_FOUND)
    return (await this.deptRepository.countDescendants(item)) - 1
  }

  /**
   * 获取部门列表树结构
   */
  async getDeptTree(
    { name }: DeptQueryDto,
    context?: Pick<IAuthUser, 'tenantId'>,
  ): Promise<DeptEntity[]> {
    const { tenantId } = requireTenantContext(context)
    const deptList = await this.deptRepository.find({
      where: {
        tenantId,
        ...(name ? { name: Like(`%${name}%`) } : null),
      },
      relations: ['parent'],
      order: { orderNo: 'DESC' },
    })

    const deptTree = list2Tree(deptList.map(dept => ({
      ...dept,
      parentId: dept.parent?.id ?? null,
    })))
    deleteEmptyChildren(deptTree)

    return deptTree as unknown as DeptEntity[]
  }
}
