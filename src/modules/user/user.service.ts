import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm'
import Redis from 'ioredis'
import { isEmpty, isNil } from 'lodash'
import { EntityManager, In, Like, Repository } from 'typeorm'

import { InjectRedis } from '~/common/decorators/inject-redis.decorator'

import { BusinessException } from '~/common/exceptions/biz.exception'
import { ErrorEnum } from '~/constants/error-code.constant'
import { ROOT_ROLE_ID, SYS_USER_INITPASSWORD } from '~/constants/system.constant'
import { genAuthPermKey, genAuthPVKey, genAuthTokenKey, genOnlineUserKey } from '~/helper/genRedisKey'

import { paginate } from '~/helper/paginate'
import { Pagination } from '~/helper/paginate/pagination'
import { AccountUpdateDto } from '~/modules/auth/dto/account.dto'
import { RegisterDto } from '~/modules/auth/dto/auth.dto'
import { QQService } from '~/shared/helper/qq.service'

import { hashPassword, isStrongPassword, randomSecureValue, verifyPassword } from '~/utils'

import { AccessTokenEntity } from '../auth/entities/access-token.entity'
import { DeptEntity } from '../system/dept/dept.entity'
import { ParamConfigService } from '../system/param-config/param-config.service'
import { RoleEntity } from '../system/role/role.entity'

import { UserStatus } from './constant'
import { PasswordUpdateDto } from './dto/password.dto'
import { UserDto, UserQueryDto, UserUpdateDto } from './dto/user.dto'
import { UserEntity } from './user.entity'
import { AccountInfo } from './user.model'

@Injectable()
export class UserService {
  constructor(
    @InjectRedis()
    private readonly redis: Redis,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    @InjectEntityManager() private entityManager: EntityManager,
    private readonly paramConfigService: ParamConfigService,
    private readonly qqService: QQService,
  ) {}

  async findUserById(id: number): Promise<UserEntity | undefined> {
    return this.userRepository
      .createQueryBuilder('user')
      .where({
        id,
        status: UserStatus.Enabled,
      })
      .getOne()
  }

  async findUserByUserName(username: string): Promise<UserEntity | undefined> {
    return this.userRepository
      .createQueryBuilder('user')
      .where({
        username,
        status: UserStatus.Enabled,
      })
      .getOne()
  }

  /**
   * 获取用户信息
   * @param uid user id
   */
  async getAccountInfo(uid: number): Promise<AccountInfo> {
    const user: UserEntity = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .where(`user.id = :uid`, { uid })
      .getOne()

    if (isEmpty(user))
      throw new BusinessException(ErrorEnum.USER_NOT_FOUND)

    delete user?.psalt

    return user
  }

  /**
   * 更新个人信息
   */
  async updateAccountInfo(uid: number, info: AccountUpdateDto): Promise<void> {
    const user = await this.userRepository.findOneBy({ id: uid })
    if (isEmpty(user))
      throw new BusinessException(ErrorEnum.USER_NOT_FOUND)

    const data = {
      ...(info.nickname ? { nickname: info.nickname } : null),
      ...(info.avatar ? { avatar: info.avatar } : null),
      ...(info.email ? { email: info.email } : null),
      ...(info.phone ? { phone: info.phone } : null),
      ...(info.qq ? { qq: info.qq } : null),
      ...(info.remark ? { remark: info.remark } : null),
    }

    if (!info.avatar && info.qq) {
      // 如果qq不等于原qq，则更新qq头像
      if (info.qq !== user.qq)
        data.avatar = await this.qqService.getAvater(info.qq)
    }

    await this.userRepository.update(uid, data)
  }

  /**
   * 更改密码
   */
  async updatePassword(uid: number, dto: PasswordUpdateDto): Promise<void> {
    const user = await this.userRepository.findOneBy({ id: uid })
    if (isEmpty(user))
      throw new BusinessException(ErrorEnum.USER_NOT_FOUND)

    const passwordMatched = await verifyPassword(dto.oldPassword, user.psalt, user.password)
    if (!passwordMatched)
      throw new BusinessException(ErrorEnum.PASSWORD_MISMATCH)

    const password = await hashPassword(dto.newPassword, user.psalt)
    await this.userRepository.update({ id: uid }, { password })
    await this.upgradePasswordV(user.id)
  }

  /**
   * 直接更改密码
   */
  async forceUpdatePassword(uid: number, password: string): Promise<void> {
    const user = await this.userRepository.findOneBy({ id: uid })
    if (isEmpty(user))
      throw new BusinessException(ErrorEnum.USER_NOT_FOUND)

    const newPassword = await hashPassword(password, user.psalt)
    await this.userRepository.update({ id: uid }, { password: newPassword })
    await this.upgradePasswordV(user.id)
  }

  async setPasswordHash(uid: number, password: string): Promise<void> {
    await this.userRepository.update({ id: uid }, { password })
    await this.upgradePasswordV(uid)
  }

  /**
   * 增加系统用户，如果返回false则表示已存在该用户
   */
  async create({
    username,
    password,
    roleIds,
    tenantId,
    deptId,
    ...data
  }: UserDto): Promise<void> {
    const exists = await this.userRepository.findOneBy({
      username,
    })
    if (!isEmpty(exists))
      throw new BusinessException(ErrorEnum.SYSTEM_USER_EXISTS)

    await this.entityManager.transaction(async (manager) => {
      const salt = randomSecureValue(32)

      if (!password) {
        const initPassword = await this.paramConfigService.findValueByKey(
          SYS_USER_INITPASSWORD,
        )
        password = await hashPassword(this.assertStrongInitialPassword(initPassword), salt)
      }
      else {
        password = await hashPassword(this.assertStrongInitialPassword(password), salt)
      }
      const { roles, dept } = await this.resolveTenantRelations(manager, tenantId, roleIds, deptId)
      const u = manager.create(UserEntity, {
        username,
        password,
        ...data,
        tenantId,
        psalt: salt,
        roles,
        dept,
      })

      const result = await manager.save(u)
      return result
    })
  }

  /**
   * 更新用户信息
   */
  async update(
    id: number,
    { password, deptId, roleIds, status, tenantId, ...data }: UserUpdateDto,
  ): Promise<void> {
    await this.entityManager.transaction(async (manager) => {
      if (password)
        await this.forceUpdatePassword(id, password)

      const current = await manager
        .createQueryBuilder(UserEntity, 'user')
        .leftJoinAndSelect('user.roles', 'roles')
        .leftJoinAndSelect('user.dept', 'dept')
        .where('user.id = :id', { id })
        .getOne()
      if (!current)
        throw new BusinessException(ErrorEnum.USER_NOT_FOUND)

      const targetTenantId = tenantId ?? current.tenantId
      if (tenantId && tenantId !== current.tenantId && !roleIds?.length)
        throw new BadRequestException('Changing user tenant requires role reassignment')
      if (tenantId && tenantId !== current.tenantId && current.dept && deptId === undefined)
        throw new BadRequestException('Changing user tenant requires department reassignment')
      const resolved = await this.resolveTenantRelations(manager, targetTenantId, roleIds, deptId)

      await manager.update(UserEntity, id, {
        ...data,
        tenantId: targetTenantId,
        status,
      })

      if (roleIds) {
        await manager
          .createQueryBuilder()
          .relation(UserEntity, 'roles')
          .of(id)
          .addAndRemove(resolved.roles.map(role => role.id), current.roles || [])
      }
      if (deptId !== undefined) {
        await manager
          .createQueryBuilder()
          .relation(UserEntity, 'dept')
          .of(id)
          .set(resolved.dept?.id ?? null)
      }

      if (status === 0) {
        // 禁用状态
        await this.forbidden(id)
      }
    })
  }

  /**
   * 查找用户信息
   * @param id 用户id
   */
  async info(id: number): Promise<UserEntity> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'roles')
      .leftJoinAndSelect('user.dept', 'dept')
      .where('user.id = :id', { id })
      .getOne()

    delete user.password
    delete user.psalt

    return user
  }

  /**
   * 根据ID列表删除用户
   */
  async delete(userIds: number[]): Promise<void | never> {
    const rootUserId = await this.findRootUserId()
    if (userIds.includes(rootUserId))
      throw new BadRequestException('不能删除root用户!')

    await this.userRepository.delete(userIds)
  }

  /**
   * 查找超管的用户ID
   */
  async findRootUserId(): Promise<number> {
    const user = await this.userRepository.findOneBy({
      roles: { id: ROOT_ROLE_ID },
    })
    return user.id
  }

  /**
   * 查询用户列表
   */
  async list({
    page,
    pageSize,
    username,
    nickname,
    tenantId,
    deptId,
    email,
    status,
  }: UserQueryDto): Promise<Pagination<UserEntity>> {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.dept', 'dept')
      .leftJoinAndSelect('user.roles', 'role')
      // .where('user.id NOT IN (:...ids)', { ids: [rootUserId, uid] })
      .where({
        ...(username ? { username: Like(`%${username}%`) } : null),
        ...(nickname ? { nickname: Like(`%${nickname}%`) } : null),
        ...(tenantId ? { tenantId } : null),
        ...(email ? { email: Like(`%${email}%`) } : null),
        ...(!isNil(status) ? { status } : null),
      })

    if (deptId)
      queryBuilder.andWhere('dept.id = :deptId', { deptId })

    return paginate<UserEntity>(queryBuilder, {
      page,
      pageSize,
    })
  }

  /**
   * 禁用用户
   */
  async forbidden(uid: number, accessToken?: string): Promise<void> {
    await this.redis.del(genAuthPVKey(uid))
    await this.redis.del(genAuthTokenKey(uid))
    await this.redis.del(genAuthPermKey(uid))
    if (accessToken) {
      const token = await AccessTokenEntity.findOne({
        where: { value: accessToken },
      })
      this.redis.del(genOnlineUserKey(token.id))
    }
  }

  /**
   * 禁用多个用户
   */
  async multiForbidden(uids: number[]): Promise<void> {
    if (uids) {
      const pvs: string[] = []
      const ts: string[] = []
      const ps: string[] = []
      uids.forEach((uid) => {
        pvs.push(genAuthPVKey(uid))
        ts.push(genAuthTokenKey(uid))
        ps.push(genAuthPermKey(uid))
      })
      await this.redis.del(pvs)
      await this.redis.del(ts)
      await this.redis.del(ps)
    }
  }

  /**
   * 升级用户版本密码
   */
  async upgradePasswordV(id: number): Promise<void> {
    // admin:passwordVersion:${param.id}
    const v = await this.redis.get(genAuthPVKey(id))
    if (!isEmpty(v))
      await this.redis.set(genAuthPVKey(id), Number.parseInt(v) + 1)
  }

  /**
   * 判断用户名是否存在
   */
  async exist(username: string) {
    const user = await this.userRepository.findOneBy({ username })
    if (isNil(user))
      throw new BusinessException(ErrorEnum.SYSTEM_USER_EXISTS)

    return true
  }

  /**
   * 注册
   */
  async register({ username, ...data }: RegisterDto): Promise<void> {
    const exists = await this.userRepository.findOneBy({
      username,
    })
    if (!isEmpty(exists))
      throw new BusinessException(ErrorEnum.SYSTEM_USER_EXISTS)

    await this.entityManager.transaction(async (manager) => {
      const salt = randomSecureValue(32)

      const password = await hashPassword(this.assertStrongInitialPassword(data.password), salt)

      const u = manager.create(UserEntity, {
        username,
        password,
        status: 1,
        psalt: salt,
      })

      const user = await manager.save(u)

      return user
    })
  }

  private assertStrongInitialPassword(password?: string) {
    if (!password || !isStrongPassword(password))
      throw new BadRequestException('Initial password must be 12-64 characters and contain letters and numbers')
    return password
  }

  private async resolveTenantRelations(
    manager: EntityManager,
    tenantId: number,
    roleIds?: number[],
    deptId?: number,
  ) {
    if (!Number.isInteger(Number(tenantId)) || Number(tenantId) <= 0)
      throw new BadRequestException('User tenant is required')

    const normalizedRoleIds = roleIds
      ? Array.from(new Set(roleIds.map(Number).filter(Boolean)))
      : undefined
    const roles = normalizedRoleIds
      ? await manager.findBy(RoleEntity, { id: In(normalizedRoleIds), tenantId })
      : []
    if (normalizedRoleIds && roles.length !== normalizedRoleIds.length)
      throw new BadRequestException('User roles must belong to the target tenant')

    const dept = deptId
      ? await manager.findOneBy(DeptEntity, { id: Number(deptId), tenantId })
      : null
    if (deptId && !dept)
      throw new BadRequestException('User department must belong to the target tenant')

    return { roles, dept }
  }
}
