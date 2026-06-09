import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PrescriptionEntity } from '../vpet-prescription/entities/prescription.entity'
import { RxDetailEntity } from '../vpet-prescription/entities/rx-detail.entity'
import { VisitEntity } from '../vpet-visit/entities/visit.entity'
import { BillingController } from './billing.controller'
import { BillingService } from './billing.service'
import { BillDetailEntity } from './entities/bill-detail.entity'
import { BillingPaymentEntity } from './entities/billing-payment.entity'
import { BillingEntity } from './entities/billing.entity'
import { OperationAuditLogEntity } from './entities/operation-audit-log.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BillingEntity,
      BillDetailEntity,
      BillingPaymentEntity,
      OperationAuditLogEntity,
      VisitEntity,
      PrescriptionEntity,
      RxDetailEntity,
    ]),
  ],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService, TypeOrmModule],
})
export class VpetBillingModule {}
