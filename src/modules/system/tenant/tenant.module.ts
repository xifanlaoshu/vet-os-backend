import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { TenantAreaEntity } from './tenant-area.entity'
import { TenantController } from './tenant.controller'
import { TenantEntity } from './tenant.entity'
import { TenantService } from './tenant.service'
import { UserAreaEntity } from './user-area.entity'

@Module({
  imports: [TypeOrmModule.forFeature([TenantEntity, TenantAreaEntity, UserAreaEntity])],
  controllers: [TenantController],
  providers: [TenantService],
  exports: [TypeOrmModule, TenantService],
})
export class TenantModule {}
