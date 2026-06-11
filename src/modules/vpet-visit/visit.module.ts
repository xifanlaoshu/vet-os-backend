import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AppointmentEntity } from '../vpet-appointment/entities/appointment.entity'
import { DoctorEntity } from '../vpet-appointment/entities/doctor.entity'
import { CustomerEntity } from '../vpet-customer/entities/customer.entity'
import { LabOrderEntity } from '../vpet-lab/entities/lab-order.entity'
import { PetEntity } from '../vpet-pet/entities/pet.entity'
import { PrescriptionEntity } from '../vpet-prescription/entities/prescription.entity'
import { ChronicCaseEntity } from './entities/chronic-case.entity'
import { ChronicFollowupEntity } from './entities/chronic-followup.entity'
import { DiagnosisCodeEntity } from './entities/diagnosis-code.entity'
import { ESignatureRecordEntity } from './entities/e-signature-record.entity'
import { EmrAuditLogEntity } from './entities/emr-audit-log.entity'
import { EmrUnlockRequestEntity } from './entities/emr-unlock-request.entity'
import { VisitCareFollowupLabEntity } from './entities/visit-care-followup-lab.entity'
import { VisitCareFollowupPrescriptionEntity } from './entities/visit-care-followup-prescription.entity'
import { VisitCareFollowupEntity } from './entities/visit-care-followup.entity'
import { VisitDiagnosisEntity } from './entities/visit-diagnosis.entity'
import { VisitEmrEntity } from './entities/visit-emr.entity'
import { VisitMediaBatchEntity } from './entities/visit-media-batch.entity'
import { VisitMediaFileEntity } from './entities/visit-media-file.entity'
import { VisitPlanBatchEntity } from './entities/visit-plan-batch.entity'
import { VisitProgressBatchEntity } from './entities/visit-progress-batch.entity'
import { VisitQueueEventEntity } from './entities/visit-queue-event.entity'
import { VisitEntity } from './entities/visit.entity'
import { VisitController } from './visit.controller'
import { VisitService } from './visit.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VisitEntity,
      DiagnosisCodeEntity,
      VisitEmrEntity,
      VisitDiagnosisEntity,
      VisitProgressBatchEntity,
      VisitPlanBatchEntity,
      ChronicCaseEntity,
      ChronicFollowupEntity,
      VisitCareFollowupEntity,
      VisitCareFollowupLabEntity,
      VisitCareFollowupPrescriptionEntity,
      VisitQueueEventEntity,
      VisitMediaBatchEntity,
      VisitMediaFileEntity,
      EmrAuditLogEntity,
      EmrUnlockRequestEntity,
      ESignatureRecordEntity,
      AppointmentEntity,
      CustomerEntity,
      PetEntity,
      LabOrderEntity,
      PrescriptionEntity,
      DoctorEntity,
    ]),
  ],
  controllers: [VisitController],
  providers: [VisitService],
  exports: [VisitService, TypeOrmModule],
})
export class VpetVisitModule {}
