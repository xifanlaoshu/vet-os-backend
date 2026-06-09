import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BillingEntity } from '../vpet-billing/entities/billing.entity'
import { CustomerEntity } from '../vpet-customer/entities/customer.entity'
import { PetEntity } from '../vpet-pet/entities/pet.entity'
import { VisitEntity } from '../vpet-visit/entities/visit.entity'
import { InsuranceClaimEntity } from './entities/insurance-claim.entity'
import { InsuranceController } from './insurance.controller'
import { InsuranceService } from './insurance.service'

@Module({
  imports: [TypeOrmModule.forFeature([InsuranceClaimEntity, VisitEntity, BillingEntity, CustomerEntity, PetEntity])],
  controllers: [InsuranceController],
  providers: [InsuranceService],
  exports: [InsuranceService, TypeOrmModule],
})
export class VpetInsuranceModule {}
