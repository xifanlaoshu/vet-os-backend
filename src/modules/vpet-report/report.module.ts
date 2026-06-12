import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AppointmentEntity } from '../vpet-appointment/entities/appointment.entity'
import { DoctorEntity } from '../vpet-appointment/entities/doctor.entity'
import { BillingPaymentEntity } from '../vpet-billing/entities/billing-payment.entity'
import { CustomerEntity } from '../vpet-customer/entities/customer.entity'
import { HospitalizationEntity } from '../vpet-hospitalization/entities/hospitalization.entity'
import { DrugEntity } from '../vpet-pharmacy/entities/drug.entity'
import { VpetPharmacyModule } from '../vpet-pharmacy/pharmacy.module'
import { PrescriptionEntity } from '../vpet-prescription/entities/prescription.entity'
import { ReminderEntity } from '../vpet-reminder/entities/reminder.entity'
import { ChronicCaseEntity } from '../vpet-visit/entities/chronic-case.entity'
import { ChronicFollowupEntity } from '../vpet-visit/entities/chronic-followup.entity'
import { VisitEntity } from '../vpet-visit/entities/visit.entity'
import { ReportController } from './report.controller'
import { ReportService } from './report.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AppointmentEntity,
      DoctorEntity,
      VisitEntity,
      BillingPaymentEntity,
      PrescriptionEntity,
      CustomerEntity,
      HospitalizationEntity,
      ReminderEntity,
      ChronicCaseEntity,
      ChronicFollowupEntity,
      DrugEntity,
    ]),
    VpetPharmacyModule,
  ],
  controllers: [ReportController],
  providers: [ReportService],
  exports: [ReportService],
})
export class VpetReportModule {}
