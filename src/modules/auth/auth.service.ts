import { Inject, Injectable } from '@nestjs/common'
import Redis from 'ioredis'

import { isEmpty } from 'lodash'
import { InjectRedis } from '~/common/decorators/inject-redis.decorator'

import { BusinessException } from '~/common/exceptions/biz.exception'

import { AppConfig, IAppConfig, ISecurityConfig, SecurityConfig } from '~/config'
import { ErrorEnum } from '~/constants/error-code.constant'
import { genAuthPermKey, genAuthPVKey, genAuthTokenKey, genTokenBlacklistKey } from '~/helper/genRedisKey'

import { UserService } from '~/modules/user/user.service'

import { hashPassword, isLegacyPasswordHash, verifyPassword } from '~/utils'

import { LoginLogService } from '../system/log/services/login-log.service'
import { MenuService } from '../system/menu/menu.service'
import { RoleService } from '../system/role/role.service'
import { TenantService } from '../system/tenant/tenant.service'

import { LoginToken } from './models/auth.model'
import { MfaService } from './services/mfa.service'
import { TokenService } from './services/token.service'

@Injectable()
export class AuthService {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    private menuService: MenuService,
    private roleService: RoleService,
    private tenantService: TenantService,
    private userService: UserService,
    private loginLogService: LoginLogService,
    private mfaService: MfaService,
    private tokenService: TokenService,
    @Inject(SecurityConfig.KEY) private securityConfig: ISecurityConfig,
    @Inject(AppConfig.KEY) private appConfig: IAppConfig,
  ) {}

  async validateUser(credential: string, password: string): Promise<any> {
    const user = await this.userService.findUserByUserName(credential)

    if (isEmpty(user))
      throw new BusinessException(ErrorEnum.USER_NOT_FOUND)

    const passwordValid = await verifyPassword(password, user.psalt, user.password)
    if (!passwordValid)
      throw new BusinessException(ErrorEnum.INVALID_USERNAME_PASSWORD)

    if (user) {
      const { password, ...result } = user
      return result
    }

    return null
  }

  /**
   * 获取登录JWT
   * 返回null则账号密码有误，不存在该用户
   */
  async login(
    username: string,
    password: string,
    ip: string,
    ua: string,
    mfaCode?: string,
  ): Promise<LoginToken> {
    const user = await this.userService.findUserByUserName(username)
    if (isEmpty(user))
      throw new BusinessException(ErrorEnum.INVALID_USERNAME_PASSWORD)

    const passwordValid = await verifyPassword(password, user.psalt, user.password)
    if (!passwordValid)
      throw new BusinessException(ErrorEnum.INVALID_USERNAME_PASSWORD)

    if (isLegacyPasswordHash(user.password))
      await this.userService.setPasswordHash(user.id, await hashPassword(password, user.psalt))

    this.mfaService.assertLoginAllowed(user, mfaCode)

    const roleIds = await this.roleService.getRoleIdsByUser(user.id)

    const roles = await this.roleService.getRoleValues(roleIds)

    // 包含access_token和refresh_token
    const token = await this.tokenService.generateAccessToken(user.id, roles, { contextSelected: false } as any)

    await this.redis.set(genAuthTokenKey(user.id), token.accessToken, 'EX', this.securityConfig.jwtExprire)

    // 设置密码版本号 当密码修改时，版本号+1
    await this.redis.set(genAuthPVKey(user.id), 1)

    // 设置菜单权限
    await this.setPermissionsCache(user.id, [])

    await this.loginLogService.create(user.id, ip, ua)

    return {
      token: token.accessToken,
      refreshToken: token.refreshToken,
    }
  }

  async refreshLoginToken(refreshToken: string) {
    const token = await this.tokenService.rotateRefreshToken(refreshToken)
    const previousTokenTtl = Math.max(
      1,
      Math.ceil((new Date(token.previousAccessTokenExpiresAt).getTime() - Date.now()) / 1000),
    )
    await Promise.all([
      this.redis.set(genTokenBlacklistKey(token.previousAccessToken), token.previousAccessToken, 'EX', previousTokenTtl),
      this.redis.set(genAuthTokenKey(token.uid), token.accessToken, 'EX', this.securityConfig.jwtExprire),
    ])
    return token
  }

  /**
   * 效验账号密码
   */
  async checkPassword(username: string, password: string) {
    const user = await this.userService.findUserByUserName(username)

    const passwordValid = await verifyPassword(password, user.psalt, user.password)
    if (!passwordValid)
      throw new BusinessException(ErrorEnum.INVALID_USERNAME_PASSWORD)
  }

  async loginLog(uid: number, ip: string, ua: string) {
    await this.loginLogService.create(uid, ip, ua)
  }

  /**
   * 重置密码
   */
  async resetPassword(username: string, password: string) {
    const user = await this.userService.findUserByUserName(username)

    await this.userService.forceUpdatePassword(user.id, password)
  }

  /**
   * 清除登录状态信息
   */
  async clearLoginStatus(user: IAuthUser, accessToken?: string): Promise<void> {
    if (!accessToken)
      throw new BusinessException(ErrorEnum.INVALID_LOGIN)

    const exp = user.exp ? (user.exp - Date.now() / 1000).toFixed(0) : this.securityConfig.jwtExprire
    await this.redis.set(genTokenBlacklistKey(accessToken), accessToken, 'EX', exp)
    if (this.appConfig.multiDeviceLogin)
      await this.tokenService.removeAccessToken(accessToken)
    else
      await this.userService.forbidden(user.uid, accessToken)
  }

  /**
   * 获取菜单列表
   */
  async getMenus(user: Pick<IAuthUser, 'uid' | 'tenantId' | 'platformAdmin'>) {
    return this.menuService.getMenus(user.uid, user)
  }

  /**
   * 获取权限列表
   */
  async getPermissions(user: Pick<IAuthUser, 'uid' | 'tenantId' | 'platformAdmin'>): Promise<string[]> {
    return this.menuService.getPermissions(user.uid, user)
  }

  async getPermissionsCache(uid: number): Promise<string[] | null> {
    const permissionString = await this.redis.get(genAuthPermKey(uid))
    return permissionString ? JSON.parse(permissionString) : null
  }

  async setPermissionsCache(uid: number, permissions: string[]): Promise<void> {
    await this.redis.set(genAuthPermKey(uid), JSON.stringify(permissions))
  }

  async getPasswordVersionByUid(uid: number): Promise<string> {
    return this.redis.get(genAuthPVKey(uid))
  }

  async getTokenByUid(uid: number): Promise<string> {
    return this.redis.get(genAuthTokenKey(uid))
  }

  async getContext(user: IAuthUser) {
    const context = await this.tenantService.resolveDefaultContext(user.uid, user.platformAdmin)
    const currentArea = context.areaOptions.find(
      item => item.tenantId === user.tenantId && item.areaId === user.areaId,
    )

    return {
      ...context,
      tenantId: user.tenantId ?? context.tenantId,
      tenantName: user.tenantName ?? currentArea?.tenantName ?? context.tenantName,
      areaId: user.areaId ?? context.areaId,
      areaName: user.areaName ?? currentArea?.areaName ?? context.areaName,
      contextSelected: Boolean(user.contextSelected),
    }
  }

  async switchArea(user: IAuthUser, areaId: number) {
    const tenantId = user.tenantId ?? (await this.tenantService.resolveDefaultContext(user.uid, user.platformAdmin)).tenantId
    return this.selectContext(user, tenantId, areaId)
  }

  async selectContext(user: IAuthUser, tenantId: number, areaId: number) {
    const options = await this.tenantService.assertUserArea(user.uid, tenantId, areaId, user.platformAdmin)
    const selected = options.find(item => item.tenantId === tenantId && item.areaId === areaId)
    const roleTenantId = user.platformAdmin ? undefined : tenantId
    const roleIds = await this.roleService.getRoleIdsByUser(user.uid, roleTenantId)
    const roles = await this.roleService.getRoleValues(roleIds, roleTenantId)

    const token = await this.tokenService.generateAccessToken(user.uid, roles, {
      accountId: user.accountId ?? user.uid,
      tenantId,
      tenantName: selected?.tenantName,
      areaId,
      areaName: selected?.areaName,
      accessibleAreaIds: options
        .filter(item => item.tenantId === tenantId)
        .map(item => item.areaId),
      platformAdmin: user.platformAdmin,
      contextSelected: true,
    })

    await this.redis.set(genAuthTokenKey(user.uid), token.accessToken, 'EX', this.securityConfig.jwtExprire)
    await this.setPermissionsCache(user.uid, await this.menuService.getPermissions(user.uid, {
      tenantId,
      platformAdmin: user.platformAdmin,
    }))
    return {
      token: token.accessToken,
      refreshToken: token.refreshToken,
      tenantId,
      tenantName: selected?.tenantName,
      areaId,
      areaName: selected?.areaName,
      areaOptions: options,
      contextSelected: true,
    }
  }
}
