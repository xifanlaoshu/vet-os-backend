import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DoctorEntity } from '../vpet-appointment/entities/doctor.entity'
import { CustomerEntity } from '../vpet-customer/entities/customer.entity'
import { PetEntity } from '../vpet-pet/entities/pet.entity'
import { VisitEntity } from '../vpet-visit/entities/visit.entity'
import { HospitalizationEntity } from './entities/hospitalization.entity'
import { NursingExecutionEntity } from './entities/nursing-execution.entity'
import { NursingPlanEntity } from './entities/nursing-plan.entity'
import { HospitalizationController } from './hospitalization.controller'
import { HospitalizationService } from './hospitalization.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HospitalizationEntity,
      NursingPlanEntity,
      NursingExecutionEntity,
      VisitEntity,
      CustomerEntity,
      PetEntity,
      DoctorEntity,
    ]),
  ],
  controllers: [HospitalizationController],
  providers: [HospitalizationService],
  exports: [HospitalizationService, TypeOrmModule],
})
export class VpetHospitalizationModule {}
