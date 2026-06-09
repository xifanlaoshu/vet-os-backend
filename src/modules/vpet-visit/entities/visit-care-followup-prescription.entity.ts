import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'
import { PrescriptionEntity } from '~/modules/vpet-prescription/entities/prescription.entity'
import { VisitCareFollowupEntity } from './visit-care-followup.entity'

@Index('idx_visit_care_followup_rx_followup', ['followupId'])
@Index('idx_visit_care_followup_rx_prescription', ['prescriptionId'])
@Index('idx_visit_care_followup_rx_unique', ['followupId', 'prescriptionId'], { unique: true })
@Entity('vpet_visit_care_followup_prescription')
export class VisitCareFollowupPrescriptionEntity extends CommonEntity {
  @Column({ name: 'followup_id' })
  followupId: number

  @ManyToOne(() => VisitCareFollowupEntity, followup => followup.prescriptionLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'followup_id' })
  followup: VisitCareFollowupEntity

  @Column({ name: 'prescription_id' })
  prescriptionId: number

  @ManyToOne(() => PrescriptionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'prescription_id' })
  prescription: PrescriptionEntity
}
