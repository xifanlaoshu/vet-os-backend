import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { UserEntity } from '~/modules/user/user.entity'

import { LegacyStorageController } from './legacy-storage.controller'
import { Storage } from './storage.entity'
import { StorageService } from './storage.service'

@Module({
  imports: [TypeOrmModule.forFeature([Storage, UserEntity])],
  controllers: [LegacyStorageController],
  providers: [StorageService],
})
export class LegacyStorageModule {}
