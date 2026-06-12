import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { ParamConfigModule } from '~/modules/system/param-config/param-config.module'
import { RoleEntity } from '~/modules/system/role/role.entity'
import { TenantAreaEntity } from '~/modules/system/tenant/tenant-area.entity'
import { TenantEntity } from '~/modules/system/tenant/tenant.entity'
import { UserAreaEntity } from '~/modules/system/tenant/user-area.entity'
import { UserEntity } from '~/modules/user/user.entity'

import { TenantAdminController } from './tenant-admin.controller'
import { TenantAdminService } from './tenant-admin.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([TenantEntity, TenantAreaEntity, UserAreaEntity, UserEntity, RoleEntity]),
    ParamConfigModule,
  ],
  controllers: [TenantAdminController],
  providers: [TenantAdminService],
})
export class TenantAdminModule {}
