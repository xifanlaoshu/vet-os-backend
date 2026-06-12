import type { Type } from '@nestjs/common'

import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common'
import { ApiBody, IntersectionType, PartialType } from '@nestjs/swagger'
import { upperFirst } from 'lodash'
import pluralize from 'pluralize'

import { ApiResult } from '~/common/decorators/api-result.decorator'
import { IdParam } from '~/common/decorators/id-param.decorator'
import { PagerDto } from '~/common/dto/pager.dto'
import { Perm } from '~/modules/auth/decorators/permission.decorator'

import { BaseService } from './base.service'

export function BaseCrudFactory<
  E extends new (...args: any[]) => any,
>({ entity, dto, permissions }: { entity: E, dto?: Type<any>, permissions?: Record<string, string> }): Type<any> {
  const prefix = entity.name.toLowerCase().replace(/entity$/, '')
  const pluralizeName = pluralize(prefix) as string

  dto = dto ?? class extends entity {}

  class Dto extends dto {
    static readonly name = upperFirst(`${pluralizeName}Dto`)
  }
  class UpdateDto extends PartialType(Dto) {
    static readonly name = upperFirst(`${pluralizeName}UpdateDto`)
  }
  class QueryDto extends IntersectionType(PagerDto, PartialType(Dto)) {
    static readonly name = upperFirst(`${pluralizeName}QueryDto`)
  }

  permissions = permissions ?? {
    LIST: `${prefix}:list`,
    CREATE: `${prefix}:create`,
    READ: `${prefix}:read`,
    UPDATE: `${prefix}:update`,
    DELETE: `${prefix}:delete`,
  } as const
  const routePermissions = permissions

  @Controller(pluralizeName)
  class BaseController<S extends BaseService<E>> {
    constructor(private service: S) { }

    @Get()
    @Perm(routePermissions.LIST)
    @ApiResult({ type: [entity], isPage: true })
    async list(@Query() pager: QueryDto) {
      return await this.service.list(pager)
    }

    @Get(':id')
    @Perm(routePermissions.READ)
    @ApiResult({ type: entity })
    async get(@IdParam() id: number) {
      return await this.service.findOne(id)
    }

    @Post()
    @Perm(routePermissions.CREATE)
    @ApiBody({ type: dto })
    async create(@Body() dto: Dto) {
      return await this.service.create(dto)
    }

    @Put(':id')
    @Perm(routePermissions.UPDATE)
    async update(@IdParam() id: number, @Body() dto: UpdateDto) {
      return await this.service.update(id, dto)
    }

    @Patch(':id')
    @Perm(routePermissions.UPDATE)
    async patch(@IdParam() id: number, @Body() dto: UpdateDto) {
      await this.service.update(id, dto)
    }

    @Delete(':id')
    @Perm(routePermissions.DELETE)
    async delete(@IdParam() id: number) {
      await this.service.delete(id)
    }
  }

  return BaseController
}
