import { Body, Controller, ForbiddenException, Get, Post, Put, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'

import { IdParam } from '~/common/decorators/id-param.decorator'
import { ApiSecurityAuth } from '~/common/decorators/swagger.decorator'
import { AllowAnon } from '~/modules/auth/decorators/allow-anon.decorator'
import { AuthUser } from '~/modules/auth/decorators/auth-user.decorator'
import { definePermission, Perm } from '~/modules/auth/decorators/permission.decorator'

import { TenantAreaDto, TenantAreaQueryDto, TenantDto, TenantQueryDto } from './tenant.dto'
import { TenantService } from './tenant.service'

export const permissions = definePermission('system:tenant', {
  LIST: 'list',
  CREATE: 'create',
  UPDATE: 'update',
  AREA_LIST: 'area:list',
  AREA_CREATE: 'area:create',
  AREA_UPDATE: 'area:update',
} as const)

@ApiTags('System - Tenant Area')
@ApiSecurityAuth()
@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get('context')
  @ApiOperation({ summary: 'Get current account tenant and area context' })
  @AllowAnon()
  async context(@AuthUser() user: IAuthUser) {
    return this.tenantService.resolveDefaultContext(user.uid, user.platformAdmin)
  }

  @Get()
  @ApiOperation({ summary: 'Tenant list' })
  @Perm(permissions.LIST)
  async listTenants(@Query() dto: TenantQueryDto, @AuthUser() user: IAuthUser) {
    this.assertPlatformAdmin(user)
    return this.tenantService.listTenants(dto)
  }

  @Get('options')
  @ApiOperation({ summary: 'Tenant options' })
  @Perm(permissions.LIST)
  async tenantOptions(@AuthUser() user: IAuthUser) {
    this.assertPlatformAdmin(user)
    return this.tenantService.tenantOptions()
  }

  @Post()
  @ApiOperation({ summary: 'Create tenant' })
  @Perm(permissions.CREATE)
  async createTenant(@Body() dto: TenantDto, @AuthUser() user: IAuthUser) {
    this.assertPlatformAdmin(user)
    return this.tenantService.createTenant(dto)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update tenant' })
  @Perm(permissions.UPDATE)
  async updateTenant(@IdParam() id: number, @Body() dto: TenantDto, @AuthUser() user: IAuthUser) {
    this.assertPlatformAdmin(user)
    return this.tenantService.updateTenant(id, dto)
  }

  @Get('areas')
  @ApiOperation({ summary: 'Tenant area list' })
  @Perm(permissions.AREA_LIST)
  async listAreas(@Query() dto: TenantAreaQueryDto, @AuthUser() user: IAuthUser) {
    this.assertPlatformAdmin(user)
    return this.tenantService.listAreas(dto)
  }

  @Get('areas/options')
  @ApiOperation({ summary: 'Tenant area options' })
  @Perm(permissions.LIST)
  async areaOptions(@Query('tenantId') tenantId: string | undefined, @AuthUser() user: IAuthUser) {
    this.assertPlatformAdmin(user)
    return this.tenantService.areaOptions(tenantId ? Number(tenantId) : undefined)
  }

  @Post('areas')
  @ApiOperation({ summary: 'Create tenant area' })
  @Perm(permissions.AREA_CREATE)
  async createArea(@Body() dto: TenantAreaDto, @AuthUser() user: IAuthUser) {
    this.assertPlatformAdmin(user)
    return this.tenantService.createArea(dto)
  }

  @Put('areas/:id')
  @ApiOperation({ summary: 'Update tenant area' })
  @Perm(permissions.AREA_UPDATE)
  async updateArea(@IdParam() id: number, @Body() dto: TenantAreaDto, @AuthUser() user: IAuthUser) {
    this.assertPlatformAdmin(user)
    return this.tenantService.updateArea(id, dto)
  }

  private assertPlatformAdmin(user: IAuthUser) {
    if (!user?.platformAdmin)
      throw new ForbiddenException('Tenant platform management requires platform administrator privileges')
  }
}
