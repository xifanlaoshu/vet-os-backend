import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DoctorEntity } from '../vpet-appointment/entities/doctor.entity'
import { CustomerEntity } from '../vpet-customer/entities/customer.entity'
import { PetEntity } from '../vpet-pet/entities/pet.entity'
import { VisitEntity } from '../vpet-visit/entities/visit.entity'
import { ConsentController } from './consent.controller'
import { ConsentService } from './consent.service'
import { ConsentRecordEntity } from './entities/consent-record.entity'
import { ConsentTemplateChargeItemEntity } from './entities/consent-template-charge-item.entity'
import { ConsentTemplateEntity } from './entities/consent-template.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ConsentTemplateEntity,
      ConsentRecordEntity,
      ConsentTemplateChargeItemEntity,
      VisitEntity,
      CustomerEntity,
      PetEntity,
      DoctorEntity,
    ]),
  ],
  controllers: [ConsentController],
  providers: [ConsentService],
  exports: [ConsentService, TypeOrmModule],
})
export class VpetConsentModule {}
