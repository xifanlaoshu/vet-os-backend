import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm'
import { isEmpty, isNil } from 'lodash'
import { EntityManager, In, Repository } from 'typeorm'

import { ROOT_ROLE_ID, SYS_USER_INITPASSWORD } from '~/constants/system.constant'
import { paginate } from '~/helper/paginate'
import { ParamConfigService } from '~/modules/system/param-config/param-config.service'
import { RoleEntity } from '~/modules/system/role/role.entity'
import { TenantAreaEntity } from '~/modules/system/tenant/tenant-area.entity'
import { TenantEntity } from '~/modules/system/tenant/tenant.entity'
import { UserAreaEntity } from '~/modules/system/tenant/user-area.entity'
import { UserEntity } from '~/modules/user/user.entity'
import { md5, randomValue } from '~/utils'

import {
  TenantAdminAreaDto,
  TenantAdminAreaQueryDto,
  TenantAdminUserDto,
  TenantAdminUserQueryDto,
  TenantAdminUserUpdateDto,
} from './tenant-admin.dto'

@Injectable()
export class TenantAdminService {
  constructor(
    @InjectRepository(TenantEntity)
    private readonly tenantRepository: Repository<TenantEntity>,
    @InjectRepository(TenantAreaEntity)
    private readonly areaRepository: Repository<TenantAreaEntity>,
    @InjectRepository(UserAreaEntity)
    private readonly userAreaRepository: Repository<UserAreaEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
    private readonly paramConfigService: ParamConfigService,
  ) {}

  async tenantProfile(user: IAuthUser) {
    const tenantId = this.requireTenant(user)
    return this.tenantRepository.findOneBy({ id: tenantId })
  }

  async listAreas(dto: TenantAdminAreaQueryDto, user: IAuthUser) {
    const tenantId = this.requireTenant(user)
    const qb = this.areaRepository
      .createQueryBuilder('area')
      .where('area.tenantId = :tenantId', { tenantId })

    if (dto.keyword) {
      qb.andWhere(
        '(area.code LIKE :keyword OR area.name LIKE :keyword OR area.shortName LIKE :keyword OR area.contactPhone LIKE :keyword)',
        { keyword: `%${dto.keyword}%` },
      )
    }
    if (!isNil(dto.status))
      qb.andWhere('area.status = :status', { status: dto.status })

    qb.orderBy('area.sortNo', 'ASC').addOrderBy('area.id', 'ASC')
    return paginate(qb, { page: dto.page, pageSize: dto.pageSize })
  }

  async areaOptions(user: IAuthUser) {
    const tenantId = this.requireTenant(user)
    return this.areaRepository.find({
      where: { tenantId, status: 1 },
      order: { sortNo: 'ASC', id: 'ASC' },
    })
  }

  async createArea(dto: TenantAdminAreaDto, user: IAuthUser) {
    const tenantId = this.requireTenant(user)
    const exists = await this.areaRepository.findOneBy({ tenantId, code: dto.code })
    if (exists)
      throw new BadRequestException('院区编码已存在')

    const area = await this.areaRepository.save(this.areaRepository.create({
      ...dto,
      tenantId,
      status: dto.status ?? 1,
      defaultArea: dto.defaultArea ?? 0,
      sortNo: dto.sortNo ?? 0,
    }))
    if (Number(area.defaultArea) === 1)
      await this.ensureSingleDefaultArea(tenantId, area.id)
    return area
  }

  async updateArea(id: number, dto: TenantAdminAreaDto, user: IAuthUser) {
    const tenantId = this.requireTenant(user)
    const current = await this.areaRepository.findOneBy({ id, tenantId })
    if (!current)
      throw new BadRequestException('院区不存在或无权访问')

    if (dto.code && dto.code !== current.code) {
      const exists = await this.areaRepository.findOneBy({ tenantId, code: dto.code })
      if (exists && exists.id !== id)
        throw new BadRequestException('院区编码已存在')
    }

    await this.areaRepository.update({ id, tenantId }, {
      ...dto,
      tenantId,
      status: dto.status ?? current.status,
      defaultArea: dto.defaultArea ?? current.defaultArea,
      sortNo: dto.sortNo ?? current.sortNo,
    })
    if (Number(dto.defaultArea) === 1)
      await this.ensureSingleDefaultArea(tenantId, id)
    return this.areaRepository.findOneBy({ id, tenantId })
  }

  async listUsers(dto: TenantAdminUserQueryDto, user: IAuthUser) {
    const tenantId = this.requireTenant(user)
    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .leftJoin(UserAreaEntity, 'ua', 'ua.user_id = user.id AND ua.tenant_id = :tenantId', { tenantId })
      .where('(user.tenantId = :tenantId OR ua.id IS NOT NULL)', { tenantId })
      .distinct(true)

    if (dto.username)
      qb.andWhere('user.username LIKE :username', { username: `%${dto.username}%` })
    if (dto.nickname)
      qb.andWhere('user.nickname LIKE :nickname', { nickname: `%${dto.nickname}%` })
    if (dto.phone)
      qb.andWhere('user.phone LIKE :phone', { phone: `%${dto.phone}%` })
    if (!isNil(dto.status))
      qb.andWhere('user.status = :status', { status: dto.status })

    qb.orderBy('user.createdAt', 'DESC')
    const page = await paginate(qb, { page: dto.page, pageSize: dto.pageSize })
    await this.attachTenantAreas(page.items, tenantId)
    return page
  }

  async userInfo(id: number, user: IAuthUser) {
    const tenantId = this.requireTenant(user)
    await this.assertUserInTenant(id, tenantId)
    const current = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .where('user.id = :id', { id })
      .getOne()

    if (!current)
      throw new BadRequestException('用户不存在')

    delete current.password
    delete current.psalt
    await this.attachTenantAreas([current], tenantId)
    return current
  }

  async createUser(dto: TenantAdminUserDto, user: IAuthUser) {
    const tenantId = this.requireTenant(user)
    await this.validateAreas(tenantId, dto.areaIds)
    await this.validateTenantRoles(dto.roleIds)

    const exists = await this.userRepository.findOneBy({ username: dto.username })
    if (!isEmpty(exists))
      throw new BadRequestException('用户名已存在')

    await this.entityManager.transaction(async (manager) => {
      const salt = randomValue(32)
      const initialPassword = dto.password
        ? dto.password
        : (await this.paramConfigService.findValueByKey(SYS_USER_INITPASSWORD)) ?? '123456'
      const created = await manager.save(manager.create(UserEntity, {
        avatar: dto.avatar,
        username: dto.username,
        password: md5(`${initialPassword}${salt}`),
        psalt: salt,
        tenantId,
        nickname: dto.nickname,
        email: dto.email,
        phone: dto.phone,
        remark: dto.remark,
        status: dto.status ?? 1,
        roles: await manager.findBy(RoleEntity, { id: In(dto.roleIds) }),
      }))
      await this.replaceTenantAreaGrants(manager, created.id, tenantId, dto.areaIds, dto.defaultAreaId)
    })
  }

  async updateUser(id: number, dto: TenantAdminUserUpdateDto, user: IAuthUser) {
    const tenantId = this.requireTenant(user)
    await this.assertUserInTenant(id, tenantId)
    await this.validateAreas(tenantId, dto.areaIds)
    await this.validateTenantRoles(dto.roleIds)

    await this.entityManager.transaction(async (manager) => {
      const updatePayload: Partial<UserEntity> = {
        avatar: dto.avatar,
        nickname: dto.nickname,
        email: dto.email,
        phone: dto.phone,
        remark: dto.remark,
        status: dto.status ?? 1,
      }
      if (dto.password) {
        const current = await manager.findOneBy(UserEntity, { id })
        updatePayload.password = md5(`${dto.password}${current.psalt}`)
      }

      await manager.update(UserEntity, { id }, updatePayload)

      const current = await manager
        .createQueryBuilder(UserEntity, 'user')
        .leftJoinAndSelect('user.roles', 'role')
        .where('user.id = :id', { id })
        .getOne()
      await manager
        .createQueryBuilder()
        .relation(UserEntity, 'roles')
        .of(id)
        .addAndRemove(dto.roleIds, current?.roles || [])

      await this.replaceTenantAreaGrants(manager, id, tenantId, dto.areaIds, dto.defaultAreaId)
    })
  }

  async tenantRoleOptions() {
    return this.roleRepository.find({
      where: { status: 1 },
      order: { id: 'ASC' },
    }).then(rows => rows.filter(role => role.id !== ROOT_ROLE_ID && role.value !== 'admin'))
  }

  private requireTenant(user: IAuthUser) {
    const tenantId = Number(user?.tenantId)
    if (!tenantId)
      throw new BadRequestException('请先选择租户')
    return tenantId
  }

  private async ensureSingleDefaultArea(tenantId: number, areaId: number) {
    await this.areaRepository
      .createQueryBuilder()
      .update(TenantAreaEntity)
      .set({ defaultArea: 0 })
      .where('tenant_id = :tenantId', { tenantId })
      .andWhere('id <> :areaId', { areaId })
      .execute()
  }

  private async validateAreas(tenantId: number, areaIds: number[]) {
    const normalized = Array.from(new Set((areaIds || []).map(Number).filter(Boolean)))
    if (!normalized.length)
      throw new BadRequestException('至少需要选择一个院区')

    const count = await this.areaRepository.countBy({ tenantId, id: In(normalized), status: 1 })
    if (count !== normalized.length)
      throw new BadRequestException('存在无效或停用的院区')
  }

  private async validateTenantRoles(roleIds: number[]) {
    const normalized = Array.from(new Set((roleIds || []).map(Number).filter(Boolean)))
    if (!normalized.length)
      throw new BadRequestException('至少需要选择一个角色')
    if (normalized.includes(ROOT_ROLE_ID))
      throw new BadRequestException('租户级用户不能分配系统超级管理员角色')

    const roles = await this.roleRepository.findBy({ id: In(normalized), status: 1 })
    if (roles.length !== normalized.length || roles.some(role => role.value === 'admin'))
      throw new BadRequestException('存在无效或不可分配的角色')
  }

  private async assertUserInTenant(userId: number, tenantId: number) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoin(UserAreaEntity, 'ua', 'ua.user_id = user.id AND ua.tenant_id = :tenantId', { tenantId })
      .where('user.id = :userId', { userId })
      .andWhere('(user.tenantId = :tenantId OR ua.id IS NOT NULL)', { tenantId })
      .getOne()

    if (!user)
      throw new BadRequestException('用户不存在或不属于当前租户')
  }

  private async replaceTenantAreaGrants(
    manager: EntityManager,
    userId: number,
    tenantId: number,
    areaIds: number[],
    defaultAreaId?: number,
  ) {
    const normalized = Array.from(new Set((areaIds || []).map(Number).filter(Boolean)))
    const selectedDefault = normalized.includes(Number(defaultAreaId)) ? Number(defaultAreaId) : normalized[0]

    await manager.delete(UserAreaEntity, { userId, tenantId })
    await manager.save(UserAreaEntity, normalized.map(areaId => manager.create(UserAreaEntity, {
      userId,
      tenantId,
      areaId,
      defaultArea: areaId === selectedDefault ? 1 : 0,
    })))
  }

  private async attachTenantAreas(users: UserEntity[], tenantId: number) {
    if (!users.length)
      return
    const rows = await this.userAreaRepository
      .createQueryBuilder('ua')
      .innerJoin(TenantAreaEntity, 'area', 'area.id = ua.area_id AND area.tenant_id = ua.tenant_id')
      .select([
        'ua.user_id AS userId',
        'ua.area_id AS areaId',
        'area.name AS areaName',
        'ua.default_area AS defaultArea',
      ])
      .where('ua.tenant_id = :tenantId', { tenantId })
      .andWhere('ua.user_id IN (:...userIds)', { userIds: users.map(item => item.id) })
      .orderBy('ua.default_area', 'DESC')
      .addOrderBy('area.sort_no', 'ASC')
      .getRawMany()

    const map = new Map<number, any[]>()
    rows.forEach((row) => {
      const userId = Number(row.userId)
      const list = map.get(userId) || []
      list.push({
        areaId: Number(row.areaId),
        areaName: row.areaName,
        defaultArea: Number(row.defaultArea),
      })
      map.set(userId, list)
    })

    users.forEach((item) => {
      ;(item as any).tenantAreas = map.get(item.id) || []
    })
  }
}
