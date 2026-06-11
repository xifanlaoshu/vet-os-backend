import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'
import { VisitMediaBatchEntity } from './visit-media-batch.entity'
import { VisitEntity } from './visit.entity'

@Index('idx_visit_media_file_batch', ['batchId'])
@Index('idx_visit_media_file_visit', ['visitId'])
@Entity('vpet_visit_media_file')
export class VisitMediaFileEntity extends CommonEntity {
  @Column({ name: 'batch_id' })
  batchId: number

  @ManyToOne(() => VisitMediaBatchEntity, batch => batch.files, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'batch_id' })
  batch: VisitMediaBatchEntity

  @Column({ name: 'visit_id' })
  visitId: number

  @ManyToOne(() => VisitEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'visit_id' })
  visit: VisitEntity

  @Column({ name: 'file_type', length: 20 })
  fileType: string

  @Column({ name: 'storage_type', length: 20 })
  storageType: string

  @Column({ name: 'file_name', length: 255, nullable: true })
  fileName: string | null

  @Column({ name: 'original_name', length: 255, nullable: true })
  originalName: string | null

  @Column({ type: 'varchar', length: 1000 })
  url: string

  @Column({ name: 'mime_type', length: 120, nullable: true })
  mimeType: string | null

  @Column({ name: 'file_size', nullable: true })
  fileSize: number | null

  @Column({ name: 'sort_no', default: 0 })
  sortNo: number

  @Column({ type: 'text', nullable: true })
  remark: string | null
}
