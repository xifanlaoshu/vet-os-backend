import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm'
import { isEmpty, isNil } from 'lodash'
import { EntityManager, In, Repository } from 'typeorm'

import { PagerDto } from '~/common/dto/pager.dto'
import { requireTenantContext } from '~/common/utils/tenant-context.util'
import { ROOT_ROLE_ID } from '~/constants/system.constant'
import { paginate } from '~/helper/paginate'
import { Pagination } from '~/helper/paginate/pagination'
import { MenuEntity } from '~/modules/system/menu/menu.entity'
import { RoleEntity } from '~/modules/system/role/role.entity'

import { RoleDto, RoleQueryDto, RoleUpdateDto } from './role.dto'

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(RoleEntity)
    private roleRepository: Repository<RoleEntity>,
    @InjectRepository(MenuEntity)
    private menuRepository: Repository<MenuEntity>,
    @InjectEntityManager() private entityManager: EntityManager,
  ) {}

  /**
   * 列举所有角色：除去超级管理员
   */
  async findAll({
    page,
    pageSize,
  }: PagerDto, context?: Pick<IAuthUser, 'tenantId'>): Promise<Pagination<RoleEntity>> {
    const { tenantId } = requireTenantContext(context)
    const queryBuilder = this.roleRepository
      .createQueryBuilder('role')
      .where('role.tenantId = :tenantId', { tenantId })

    return paginate<RoleEntity>(queryBuilder, { page, pageSize })
  }

  /**
   * 查询角色列表
   */
  async list({
    page,
    pageSize,
    name,
    value,
    remark,
    status,
  }: RoleQueryDto, context?: Pick<IAuthUser, 'tenantId'>): Promise<Pagination<RoleEntity>> {
    const { tenantId } = requireTenantContext(context)
    const queryBuilder = await this.roleRepository
      .createQueryBuilder('role')
      .where('role.tenantId = :tenantId', { tenantId })

    if (name)
      queryBuilder.andWhere('role.name LIKE :name', { name: `%${name}%` })
    if (value)
      queryBuilder.andWhere('role.value LIKE :value', { value: `%${value}%` })
    if (remark)
      queryBuilder.andWhere('role.remark LIKE :remark', { remark: `%${remark}%` })
    if (!isNil(status))
      queryBuilder.andWhere('role.status = :status', { status })

    return paginate<RoleEntity>(queryBuilder, {
      page,
      pageSize,
    })
  }

  /**
   * 根据角色获取角色信息
   */
  async info(id: number, context?: Pick<IAuthUser, 'tenantId'>) {
    const { tenantId } = requireTenantContext(context)
    const info = await this.roleRepository
      .createQueryBuilder('role')
      .where('role.id = :id', { id })
      .andWhere('role.tenantId = :tenantId', { tenantId })
      .getOne()
    if (!info)
      throw new BadRequestException('Role not found or not accessible')

    const menus = await this.menuRepository.find({
      where: { roles: { id } },
      select: ['id'],
    })

    return { ...info, menuIds: menus.map(m => m.id) }
  }

  async delete(id: number, context?: Pick<IAuthUser, 'tenantId'>): Promise<void> {
    const { tenantId } = requireTenantContext(context)
    if (id === ROOT_ROLE_ID)
      throw new Error('不能删除超级管理员')
    const role = await this.roleRepository.findOneBy({ id, tenantId })
    if (!role)
      throw new BadRequestException('Role not found or not accessible')
    await this.roleRepository.delete({ id, tenantId })
  }

  /**
   * 增加角色
   */
  async create({ menuIds, ...data }: RoleDto, context?: Pick<IAuthUser, 'tenantId'>): Promise<{ roleId: number }> {
    const { tenantId } = requireTenantContext(context)
    const role = await this.roleRepository.save({
      ...data,
      tenantId,
      menus: menuIds
        ? await this.menuRepository.findBy({ id: In(menuIds) })
        : [],
    })

    return { roleId: role.id }
  }

  /**
   * 更新角色信息
   * 如果传入的menuIds为空，则清空sys_role_menus表中存有的关联数据，参考新增
   */
  async update(id, { menuIds, ...data }: RoleUpdateDto, context?: Pick<IAuthUser, 'tenantId'>): Promise<void> {
    const { tenantId } = requireTenantContext(context)
    const current = await this.roleRepository.findOneBy({ id, tenantId })
    if (!current)
      throw new BadRequestException('Role not found or not accessible')

    await this.roleRepository.update({ id, tenantId }, data)
    await this.entityManager.transaction(async (manager) => {
      const role = await this.roleRepository.findOne({ where: { id, tenantId } })
      if (!role)
        throw new BadRequestException('Role not found or not accessible')
      role.menus = menuIds?.length
        ? await this.menuRepository.findBy({ id: In(menuIds) })
        : []
      await manager.save(role)
    })
  }

  /**
   * 根据用户id查找角色信息
   */
  async getRoleIdsByUser(id: number, tenantId?: number): Promise<number[]> {
    const roles = await this.roleRepository.find({
      where: {
        users: { id },
        ...(tenantId ? { tenantId } : null),
      },
    })

    if (!isEmpty(roles))
      return roles.map(r => r.id)

    return []
  }

  async getRoleValues(ids: number[], tenantId?: number): Promise<string[]> {
    if (!ids.length)
      return []

    return (
      await this.roleRepository.findBy({
        id: In(ids),
        ...(tenantId ? { tenantId } : null),
      })
    ).map(r => r.value)
  }

  async isAdminRoleByUser(uid: number, tenantId?: number): Promise<boolean> {
    const roles = await this.roleRepository.find({
      where: {
        users: { id: uid },
        ...(tenantId ? { tenantId } : null),
      },
    })

    if (!isEmpty(roles)) {
      return roles.some(
        r => r.id === ROOT_ROLE_ID,
      )
    }
    return false
  }

  hasAdminRole(rids: number[]): boolean {
    return rids.includes(ROOT_ROLE_ID)
  }

  /**
   * 根据角色ID查找是否有关联用户
   */
  async checkUserByRoleId(id: number, context?: Pick<IAuthUser, 'tenantId'>): Promise<boolean> {
    const { tenantId } = requireTenantContext(context)
    const role = await this.roleRepository.findOneBy({ id, tenantId })
    if (!role)
      return false

    return this.roleRepository.exist({
      where: {
        id,
        tenantId,
        users: {
          roles: { id },
        },
      },
    })
  }
}
