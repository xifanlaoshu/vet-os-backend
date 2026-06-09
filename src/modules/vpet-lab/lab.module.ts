import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DoctorEntity } from '../vpet-appointment/entities/doctor.entity'
import { CustomerEntity } from '../vpet-customer/entities/customer.entity'
import { PetEntity } from '../vpet-pet/entities/pet.entity'
import { VisitEntity } from '../vpet-visit/entities/visit.entity'
import { LabOrderEntity } from './entities/lab-order.entity'
import { LabResultItemEntity } from './entities/lab-result-item.entity'
import { LabTemplateEntity } from './entities/lab-template.entity'
import { LisOrderEntity } from './entities/lis-order.entity'
import { LabController } from './lab.controller'
import { LabService } from './lab.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LabOrderEntity,
      LabResultItemEntity,
      LisOrderEntity,
      LabTemplateEntity,
      VisitEntity,
      CustomerEntity,
      PetEntity,
      DoctorEntity,
    ]),
  ],
  controllers: [LabController],
  providers: [LabService],
  exports: [LabService, TypeOrmModule],
})
export class VpetLabModule {}
