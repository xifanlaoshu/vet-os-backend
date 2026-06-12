import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'
import { CustomerEntity } from '~/modules/vpet-customer/entities/customer.entity'
import { PetEntity } from '~/modules/vpet-pet/entities/pet.entity'
import { ChronicFollowupEntity } from './chronic-followup.entity'
import { VisitEntity } from './visit.entity'

@Index('idx_vpet_chronic_case_pet', ['petId'])
@Index('idx_vpet_chronic_case_status', ['status'])
@Entity('vpet_chronic_case')
export class ChronicCaseEntity extends CommonEntity {
  @Column({ name: 'tenant_id', default: 1, comment: '租户 ID' })
  tenantId: number

  @Column({ name: 'area_id', default: 1, comment: '院区 ID' })
  areaId: number

  @Column({ name: 'case_no', length: 30, unique: true })
  caseNo: string

  @Column({ name: 'customer_id' })
  customerId: number

  @ManyToOne(() => CustomerEntity)
  @JoinColumn({ name: 'customer_id' })
  customer: CustomerEntity

  @Column({ name: 'pet_id' })
  petId: number

  @ManyToOne(() => PetEntity)
  @JoinColumn({ name: 'pet_id' })
  pet: PetEntity

  @Column({ nullable: true, name: 'visit_id' })
  visitId: number | null

  @ManyToOne(() => VisitEntity, { nullable: true })
  @JoinColumn({ name: 'visit_id' })
  visit: VisitEntity | null

  @Column({ length: 100, name: 'disease_name' })
  diseaseName: string

  @Column({ type: 'json', nullable: true, name: 'disease_tags' })
  diseaseTags: Array<string> | null

  @Column({ type: 'text', nullable: true, name: 'initial_summary' })
  initialSummary: string | null

  @Column({ type: 'text', nullable: true, name: 'management_goal' })
  managementGoal: string | null

  @Column({ type: 'json', nullable: true, name: 'care_plan' })
  carePlan: Array<Record<string, any>> | null

  @Column({ type: 'json', nullable: true, name: 'tracking_schema' })
  trackingSchema: Array<Record<string, any>> | null

  @Column({ type: 'date', nullable: true, name: 'next_review_date' })
  nextReviewDate: string | null

  @Column({ type: 'tinyint', default: 1 })
  status: number

  @Column({ type: 'json', nullable: true, name: 'customer_snapshot' })
  customerSnapshot: Record<string, any> | null

  @Column({ type: 'json', nullable: true, name: 'pet_snapshot' })
  petSnapshot: Record<string, any> | null

  @OneToMany(() => ChronicFollowupEntity, followup => followup.chronicCase)
  followups: ChronicFollowupEntity[]
}
