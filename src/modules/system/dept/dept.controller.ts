import { Body, Controller, Delete, Get, Post, Put, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'

import { ApiResult } from '~/common/decorators/api-result.decorator'
import { IdParam } from '~/common/decorators/id-param.decorator'
import { ApiSecurityAuth } from '~/common/decorators/swagger.decorator'
import { BusinessException } from '~/common/exceptions/biz.exception'
import { CreatorPipe } from '~/common/pipes/creator.pipe'
import { UpdaterPipe } from '~/common/pipes/updater.pipe'
import { ErrorEnum } from '~/constants/error-code.constant'
import { AuthUser } from '~/modules/auth/decorators/auth-user.decorator'
import { definePermission, Perm } from '~/modules/auth/decorators/permission.decorator'
import { DeptEntity } from '~/modules/system/dept/dept.entity'

import { DeptDto, DeptQueryDto } from './dept.dto'
import { DeptService } from './dept.service'

export const permissions = definePermission('system:dept', {
  LIST: 'list',
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
} as const)

@ApiSecurityAuth()
@ApiTags('System - Dept')
@Controller('depts')
export class DeptController {
  constructor(private deptService: DeptService) {}

  @Get()
  @ApiOperation({ summary: 'Department list' })
  @ApiResult({ type: [DeptEntity] })
  @Perm(permissions.LIST)
  async list(@Query() dto: DeptQueryDto, @AuthUser('uid') uid: number): Promise<DeptEntity[]> {
    return this.deptService.getDeptTree(uid, dto)
  }

  @Post()
  @ApiOperation({ summary: 'Create department' })
  @Perm(permissions.CREATE)
  async create(@Body(CreatorPipe) dto: DeptDto): Promise<void> {
    await this.deptService.create(dto)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Department detail' })
  @Perm(permissions.READ)
  async info(@IdParam() id: number) {
    return this.deptService.info(id)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update department' })
  @Perm(permissions.UPDATE)
  async update(@IdParam() id: number, @Body(UpdaterPipe) updateDeptDto: DeptDto): Promise<void> {
    await this.deptService.update(id, updateDeptDto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete department' })
  @Perm(permissions.DELETE)
  async delete(@IdParam() id: number): Promise<void> {
    const count = await this.deptService.countUserByDeptId(id)
    if (count > 0)
      throw new BusinessException(ErrorEnum.DEPARTMENT_HAS_ASSOCIATED_USERS)

    const count2 = await this.deptService.countChildDept(id)
    if (count2 > 0)
      throw new BusinessException(ErrorEnum.DEPARTMENT_HAS_CHILD_DEPARTMENTS)

    await this.deptService.delete(id)
  }
}
