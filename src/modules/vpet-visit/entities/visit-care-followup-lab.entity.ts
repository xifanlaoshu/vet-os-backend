import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'
import { LabOrderEntity } from '~/modules/vpet-lab/entities/lab-order.entity'
import { VisitCareFollowupEntity } from './visit-care-followup.entity'

@Index('idx_visit_care_followup_lab_followup', ['followupId'])
@Index('idx_visit_care_followup_lab_order', ['labOrderId'])
@Index('idx_visit_care_followup_lab_unique', ['followupId', 'labOrderId'], { unique: true })
@Entity('vpet_visit_care_followup_lab')
export class VisitCareFollowupLabEntity extends CommonEntity {
  @Column({ name: 'followup_id' })
  followupId: number

  @ManyToOne(() => VisitCareFollowupEntity, followup => followup.labLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'followup_id' })
  followup: VisitCareFollowupEntity

  @Column({ name: 'lab_order_id' })
  labOrderId: number

  @ManyToOne(() => LabOrderEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lab_order_id' })
  labOrder: LabOrderEntity
}
