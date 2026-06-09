import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AppointmentEntity } from '../vpet-appointment/entities/appointment.entity'
import { CustomerEntity } from '../vpet-customer/entities/customer.entity'
import { PetEntity } from '../vpet-pet/entities/pet.entity'
import { ChronicCaseEntity } from './entities/chronic-case.entity'
import { ChronicFollowupEntity } from './entities/chronic-followup.entity'
import { DiagnosisCodeEntity } from './entities/diagnosis-code.entity'
import { ESignatureRecordEntity } from './entities/e-signature-record.entity'
import { EmrAuditLogEntity } from './entities/emr-audit-log.entity'
import { EmrUnlockRequestEntity } from './entities/emr-unlock-request.entity'
import { VisitDiagnosisEntity } from './entities/visit-diagnosis.entity'
import { VisitEmrEntity } from './entities/visit-emr.entity'
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
      VisitQueueEventEntity,
      EmrAuditLogEntity,
      EmrUnlockRequestEntity,
      ESignatureRecordEntity,
      AppointmentEntity,
      CustomerEntity,
      PetEntity,
    ]),
  ],
  controllers: [VisitController],
  providers: [VisitService],
  exports: [VisitService, TypeOrmModule],
})
export class VpetVisitModule {}
