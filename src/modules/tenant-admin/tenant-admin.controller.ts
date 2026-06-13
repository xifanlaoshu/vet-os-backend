import { Body, Controller, Get, Post, Put, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'

import { IdParam } from '~/common/decorators/id-param.decorator'
import { ApiSecurityAuth } from '~/common/decorators/swagger.decorator'
import { AuthUser } from '~/modules/auth/decorators/auth-user.decorator'
import { definePermission, Perm } from '~/modules/auth/decorators/permission.decorator'

import {
  TenantAdminAreaDto,
  TenantAdminAreaQueryDto,
  TenantAdminUserDto,
  TenantAdminUserQueryDto,
  TenantAdminUserUpdateDto,
} from './tenant-admin.dto'
import { TenantAdminService } from './tenant-admin.service'

export const permissions = definePermission('tenant', {
  PROFILE: 'profile',
  AREA_LIST: 'area:list',
  AREA_CREATE: 'area:create',
  AREA_UPDATE: 'area:update',
  USER_LIST: 'user:list',
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
} as const)

@ApiTags('Tenant - Admin')
@ApiSecurityAuth()
@Controller('tenant-admin')
export class TenantAdminController {
  constructor(private readonly tenantAdminService: TenantAdminService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Current tenant profile' })
  @Perm(permissions.PROFILE)
  async profile(@AuthUser() user: IAuthUser) {
    return this.tenantAdminService.tenantProfile(user)
  }

  @Get('areas')
  @ApiOperation({ summary: 'Current tenant area list' })
  @Perm(permissions.AREA_LIST)
  async areas(@Query() dto: TenantAdminAreaQueryDto, @AuthUser() user: IAuthUser) {
    return this.tenantAdminService.listAreas(dto, user)
  }

  @Get('areas/options')
  @ApiOperation({ summary: 'Current tenant area options' })
  @Perm(permissions.AREA_LIST)
  async areaOptions(@AuthUser() user: IAuthUser) {
    return this.tenantAdminService.areaOptions(user)
  }

  @Post('areas')
  @ApiOperation({ summary: 'Create current tenant area' })
  @Perm(permissions.AREA_CREATE)
  async createArea(@Body() dto: TenantAdminAreaDto, @AuthUser() user: IAuthUser) {
    return this.tenantAdminService.createArea(dto, user)
  }

  @Put('areas/:id')
  @ApiOperation({ summary: 'Update current tenant area' })
  @Perm(permissions.AREA_UPDATE)
  async updateArea(@IdParam() id: number, @Body() dto: TenantAdminAreaDto, @AuthUser() user: IAuthUser) {
    return this.tenantAdminService.updateArea(id, dto, user)
  }

  @Get('users')
  @ApiOperation({ summary: 'Current tenant user list' })
  @Perm(permissions.USER_LIST)
  async users(@Query() dto: TenantAdminUserQueryDto, @AuthUser() user: IAuthUser) {
    return this.tenantAdminService.listUsers(dto, user)
  }

  @Get('users/role-options')
  @ApiOperation({ summary: 'Assignable role options for tenant user management' })
  @Perm(permissions.USER_LIST)
  async roleOptions(@AuthUser() user: IAuthUser) {
    return this.tenantAdminService.tenantRoleOptions(user)
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Current tenant user detail' })
  @Perm(permissions.USER_READ)
  async userInfo(@IdParam() id: number, @AuthUser() user: IAuthUser) {
    return this.tenantAdminService.userInfo(id, user)
  }

  @Post('users')
  @ApiOperation({ summary: 'Create current tenant user' })
  @Perm(permissions.USER_CREATE)
  async createUser(@Body() dto: TenantAdminUserDto, @AuthUser() user: IAuthUser) {
    return this.tenantAdminService.createUser(dto, user)
  }

  @Put('users/:id')
  @ApiOperation({ summary: 'Update current tenant user' })
  @Perm(permissions.USER_UPDATE)
  async updateUser(@IdParam() id: number, @Body() dto: TenantAdminUserUpdateDto, @AuthUser() user: IAuthUser) {
    return this.tenantAdminService.updateUser(id, dto, user)
  }
}
