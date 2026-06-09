import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DoctorEntity } from '../vpet-appointment/entities/doctor.entity'
import { ChargeItemEntity } from '../vpet-pharmacy/entities/charge-item.entity'
import { DrugEntity } from '../vpet-pharmacy/entities/drug.entity'
import { VpetPharmacyModule } from '../vpet-pharmacy/pharmacy.module'
import { VisitEntity } from '../vpet-visit/entities/visit.entity'
import { PrescriptionTemplateItemEntity } from './entities/prescription-template-item.entity'
import { PrescriptionTemplateEntity } from './entities/prescription-template.entity'
import { PrescriptionEntity } from './entities/prescription.entity'
import { RxDetailEntity } from './entities/rx-detail.entity'
import { PrescriptionController } from './prescription.controller'
import { PrescriptionService } from './prescription.service'

@Module({
  imports: [
    VpetPharmacyModule,
    TypeOrmModule.forFeature([
      PrescriptionEntity,
      RxDetailEntity,
      PrescriptionTemplateEntity,
      PrescriptionTemplateItemEntity,
      VisitEntity,
      DrugEntity,
      ChargeItemEntity,
      DoctorEntity,
    ]),
  ],
  controllers: [PrescriptionController],
  providers: [PrescriptionService],
  exports: [PrescriptionService, TypeOrmModule],
})
export class VpetPrescriptionModule {}
