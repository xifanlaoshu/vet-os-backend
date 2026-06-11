import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'
import { DoctorEntity } from '~/modules/vpet-appointment/entities/doctor.entity'
import { VisitCareFollowupEntity } from './visit-care-followup.entity'
import { VisitMediaFileEntity } from './visit-media-file.entity'
import { VisitEntity } from './visit.entity'

@Index('idx_visit_media_batch_visit', ['visitId'])
@Index('idx_visit_media_batch_no', ['batchNo'], { unique: true })
@Index('idx_visit_media_batch_relation', ['visitId', 'relationType', 'careFollowupId'])
@Index('idx_visit_media_batch_captured_at', ['capturedAt'])
@Entity('vpet_visit_media_batch')
export class VisitMediaBatchEntity extends CommonEntity {
  @Column({ name: 'visit_id' })
  visitId: number

  @ManyToOne(() => VisitEntity, visit => visit.mediaBatches, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'visit_id' })
  visit: VisitEntity

  @Column({ name: 'batch_no', length: 30 })
  batchNo: string

  @Column({ type: 'datetime', name: 'captured_at' })
  capturedAt: string

  @Column({ name: 'operator_id', nullable: true })
  operatorId: number | null

  @ManyToOne(() => DoctorEntity, { nullable: true })
  @JoinColumn({ name: 'operator_id' })
  operator: DoctorEntity | null

  @Column({ name: 'relation_type', length: 20 })
  relationType: string

  @Column({ name: 'care_followup_id', nullable: true })
  careFollowupId: number | null

  @ManyToOne(() => VisitCareFollowupEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'care_followup_id' })
  careFollowup: VisitCareFollowupEntity | null

  @Column({ type: 'text', nullable: true })
  remark: string | null

  @OneToMany(() => VisitMediaFileEntity, file => file.batch)
  files: VisitMediaFileEntity[]
}
