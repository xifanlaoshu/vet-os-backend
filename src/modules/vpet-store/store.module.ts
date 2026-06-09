import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DrugEntity } from '../vpet-pharmacy/entities/drug.entity'
import { DrugTransferItemEntity } from './entities/drug-transfer-item.entity'
import { DrugTransferEntity } from './entities/drug-transfer.entity'
import { StoreDrugStockEntity } from './entities/store-drug-stock.entity'
import { StoreEntity } from './entities/store.entity'
import { StoreController } from './store.controller'
import { StoreService } from './store.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StoreEntity,
      StoreDrugStockEntity,
      DrugTransferEntity,
      DrugTransferItemEntity,
      DrugEntity,
    ]),
  ],
  controllers: [StoreController],
  providers: [StoreService],
  exports: [StoreService, TypeOrmModule],
})
export class VpetStoreModule {}
