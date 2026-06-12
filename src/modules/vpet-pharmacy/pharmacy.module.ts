import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConsentTemplateChargeItemEntity } from '../vpet-consent/entities/consent-template-charge-item.entity'
import { ConsentTemplateEntity } from '../vpet-consent/entities/consent-template.entity'
import { ChargeItemEntity } from './entities/charge-item.entity'
import { DrugBatchEntity } from './entities/drug-batch.entity'
import { DrugStockTxnEntity } from './entities/drug-stock-txn.entity'
import { DrugEntity } from './entities/drug.entity'
import { PharmacyController } from './pharmacy.controller'
import { PharmacyService } from './pharmacy.service'

@Module({
  imports: [TypeOrmModule.forFeature([DrugEntity, DrugBatchEntity, DrugStockTxnEntity, ChargeItemEntity, ConsentTemplateEntity, ConsentTemplateChargeItemEntity])],
  controllers: [PharmacyController],
  providers: [PharmacyService],
  exports: [PharmacyService, TypeOrmModule],
})
export class VpetPharmacyModule {}
