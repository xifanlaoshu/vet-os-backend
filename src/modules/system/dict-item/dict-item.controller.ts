import { Body, Controller, Delete, Get, Post, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'

import { ApiResult } from '~/common/decorators/api-result.decorator'
import { IdParam } from '~/common/decorators/id-param.decorator'
import { ApiSecurityAuth } from '~/common/decorators/swagger.decorator'
import { UpdaterPipe } from '~/common/pipes/updater.pipe'
import { Pagination } from '~/helper/paginate/pagination'
import { AllowAnon } from '~/modules/auth/decorators/allow-anon.decorator'
import { AuthUser } from '~/modules/auth/decorators/auth-user.decorator'
import { definePermission, Perm } from '~/modules/auth/decorators/permission.decorator'
import { DictItemEntity } from '~/modules/system/dict-item/dict-item.entity'

import { DictItemDto, DictItemQueryDto } from './dict-item.dto'
import { DictItemService } from './dict-item.service'

export const permissions = definePermission('system:dict-item', {
  LIST: 'list',
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
} as const)

@ApiTags('System - 字典项模块')
@ApiSecurityAuth()
@Controller('dict-item')
export class DictItemController {
  constructor(private dictItemService: DictItemService) {}

  @Get()
  @ApiOperation({ summary: '获取字典项列表' })
  @ApiResult({ type: [DictItemEntity], isPage: true })
  @AllowAnon()
  async list(@Query() dto: DictItemQueryDto, @AuthUser() user?: IAuthUser): Promise<Pagination<DictItemEntity>> {
    return this.dictItemService.page(dto, user)
  }

  @Post()
  @ApiOperation({ summary: '新增字典项' })
  @Perm(permissions.CREATE)
  async create(@Body() dto: DictItemDto, @AuthUser() user: IAuthUser): Promise<void> {
    await this.dictItemService.create(dto, user)
  }

  @Get(':id')
  @ApiOperation({ summary: '查询字典项信息' })
  @ApiResult({ type: DictItemEntity })
  @AllowAnon()
  async info(@IdParam() id: number, @AuthUser() user?: IAuthUser): Promise<DictItemEntity> {
    return this.dictItemService.findOne(id, user)
  }

  @Post(':id')
  @ApiOperation({ summary: '更新字典项' })
  @Perm(permissions.UPDATE)
  async update(@IdParam() id: number, @Body(UpdaterPipe) dto: DictItemDto, @AuthUser() user: IAuthUser): Promise<void> {
    await this.dictItemService.update(id, dto, user)
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除指定的字典项' })
  @Perm(permissions.DELETE)
  async delete(@IdParam() id: number, @AuthUser() user: IAuthUser): Promise<void> {
    await this.dictItemService.delete(id, user)
  }
}
