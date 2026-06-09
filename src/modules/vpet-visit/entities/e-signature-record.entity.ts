import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'
import { VisitEmrEntity } from './visit-emr.entity'
import { VisitEntity } from './visit.entity'

@Index('idx_vpet_e_signature_visit', ['visitId'])
@Index('idx_vpet_e_signature_signer', ['signedBy'])
@Entity('vpet_e_signature_record')
export class ESignatureRecordEntity extends CommonEntity {
  @Column({ name: 'visit_id' })
  visitId: number

  @ManyToOne(() => VisitEntity)
  @JoinColumn({ name: 'visit_id' })
  visit: VisitEntity

  @Column({ nullable: true, name: 'emr_id' })
  emrId: number | null

  @ManyToOne(() => VisitEmrEntity, { nullable: true })
  @JoinColumn({ name: 'emr_id' })
  emr: VisitEmrEntity | null

  @Column({ length: 40, name: 'sign_type' })
  signType: string

  @Column({ length: 128, name: 'signature_hash' })
  signatureHash: string

  @Column({ nullable: true, name: 'signed_by' })
  signedBy: number | null

  @Column({ type: 'datetime', name: 'signed_at' })
  signedAt: string

  @Column({ type: 'json', nullable: true, name: 'signed_snapshot' })
  signedSnapshot: Record<string, any> | null

  @Column({ type: 'tinyint', default: 1 })
  status: number
}
