import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'
import { DoctorEntity } from '~/modules/vpet-appointment/entities/doctor.entity'
import { VisitEntity } from './visit.entity'

@Index('idx_visit_diagnosis_visit', ['visitId'])
@Entity('vpet_visit_diagnosis')
export class VisitDiagnosisEntity extends CommonEntity {
  @Column({ name: 'tenant_id', default: 1, comment: '租户 ID' })
  tenantId: number

  @Column({ name: 'area_id', default: 1, comment: '院区 ID' })
  areaId: number

  @Column({ name: 'visit_id' })
  visitId: number

  @ManyToOne(() => VisitEntity, visit => visit.diagnoses)
  @JoinColumn({ name: 'visit_id' })
  visit: VisitEntity

  @Column({ length: 30, nullable: true, name: 'diagnosis_code' })
  diagnosisCode: string

  @Column({ length: 100, name: 'diagnosis_name' })
  diagnosisName: string

  @Column({ type: 'tinyint', default: 1, name: 'diagnosis_type' })
  diagnosisType: number

  @Column({ default: 0, name: 'sort_no' })
  sortNo: number

  @Column({ type: 'tinyint', default: 0, name: 'is_primary' })
  isPrimary: number

  @Column({ nullable: true, name: 'recorded_by' })
  recordedBy: number | null

  @ManyToOne(() => DoctorEntity, { nullable: true })
  @JoinColumn({ name: 'recorded_by' })
  recorder: DoctorEntity | null
}
