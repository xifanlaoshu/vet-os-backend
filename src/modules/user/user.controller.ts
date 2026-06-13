import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseArrayPipe, Post, Put, Query } from '@nestjs/common'
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'

import { ApiResult } from '~/common/decorators/api-result.decorator'
import { IdParam } from '~/common/decorators/id-param.decorator'
import { ApiSecurityAuth } from '~/common/decorators/swagger.decorator'
import { AuthUser } from '~/modules/auth/decorators/auth-user.decorator'
import { MenuService } from '~/modules/system/menu/menu.service'
import { UserAreaGrantDto } from '~/modules/system/tenant/tenant.dto'
import { TenantService } from '~/modules/system/tenant/tenant.service'

import { definePermission, Perm } from '../auth/decorators/permission.decorator'

import { UserPasswordDto } from './dto/password.dto'
import { UserDto, UserQueryDto, UserUpdateDto } from './dto/user.dto'
import { UserEntity } from './user.entity'
import { UserService } from './user.service'

export const permissions = definePermission('system:user', {
  LIST: 'list',
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',

  PASSWORD_UPDATE: 'password:update',
  PASSWORD_RESET: 'pass:reset',
} as const)

@ApiTags('System - 用户模块')
@ApiSecurityAuth()
@Controller('users')
export class UserController {
  constructor(
    private userService: UserService,
    private menuService: MenuService,
    private tenantService: TenantService,
  ) {}

  @Get()
  @ApiOperation({ summary: '获取用户列表' })
  @ApiResult({ type: [UserEntity], isPage: true })
  @Perm(permissions.LIST)
  async list(@Query() dto: UserQueryDto, @AuthUser() user: IAuthUser) {
    this.assertPlatformAdmin(user)
    return this.userService.list(dto)
  }

  @Get(':id')
  @ApiOperation({ summary: '查询用户' })
  @Perm(permissions.READ)
  async read(@IdParam() id: number, @AuthUser() user: IAuthUser) {
    this.assertPlatformAdmin(user)
    return this.userService.info(id)
  }

  @Post()
  @ApiOperation({ summary: '新增用户' })
  @Perm(permissions.CREATE)
  async create(@Body() dto: UserDto, @AuthUser() user: IAuthUser): Promise<void> {
    this.assertPlatformAdmin(user)
    await this.userService.create(dto)
  }

  @Put(':id')
  @ApiOperation({ summary: '更新用户' })
  @Perm(permissions.UPDATE)
  async update(@IdParam() id: number, @Body() dto: UserUpdateDto, @AuthUser() user: IAuthUser): Promise<void> {
    this.assertPlatformAdmin(user)
    await this.userService.update(id, dto)
    await this.menuService.refreshPerms(id)
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除用户' })
  @ApiParam({ name: 'id', type: String, schema: { oneOf: [{ type: 'string' }, { type: 'number' }] } })
  @Perm(permissions.DELETE)
  async delete(@Param('id', new ParseArrayPipe({ items: Number, separator: ',' })) ids: number[], @AuthUser() user: IAuthUser): Promise<void> {
    this.assertPlatformAdmin(user)
    await this.userService.delete(ids)
    await this.userService.multiForbidden(ids)
  }

  @Post(':id/password')
  @ApiOperation({ summary: '更改用户密码' })
  @Perm(permissions.PASSWORD_UPDATE)
  async password(@IdParam() id: number, @Body() dto: UserPasswordDto, @AuthUser() user: IAuthUser): Promise<void> {
    this.assertPlatformAdmin(user)
    await this.userService.forceUpdatePassword(id, dto.password)
  }

  @Get(':id/areas')
  @ApiOperation({ summary: '查询用户可访问租户院区' })
  @Perm(permissions.READ)
  async userAreas(@IdParam() id: number, @AuthUser() user: IAuthUser) {
    this.assertPlatformAdmin(user)
    return this.tenantService.getUserAreaGrants(id)
  }

  @Put(':id/areas')
  @ApiOperation({ summary: '保存用户可访问租户院区' })
  @Perm(permissions.UPDATE)
  async saveUserAreas(@IdParam() id: number, @Body() dto: UserAreaGrantDto, @AuthUser() user: IAuthUser) {
    this.assertPlatformAdmin(user)
    return this.tenantService.saveUserAreaGrants(id, dto)
  }

  private assertPlatformAdmin(user: IAuthUser) {
    if (!user?.platformAdmin)
      throw new ForbiddenException('System user management requires platform administrator privileges')
  }
}
