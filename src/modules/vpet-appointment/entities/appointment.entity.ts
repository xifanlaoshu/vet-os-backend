import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'
import { CustomerEntity } from '~/modules/vpet-customer/entities/customer.entity'
import { PetEntity } from '~/modules/vpet-pet/entities/pet.entity'
import { DoctorEntity } from './doctor.entity'

@Index('idx_appt_time', ['appointmentTime'])
@Index('idx_appt_doctor', ['doctorId'])
@Index('idx_appt_status', ['status'])
@Entity('vpet_appointment')
export class AppointmentEntity extends CommonEntity {
  @Column()
  customerId: number

  @ManyToOne(() => CustomerEntity, { nullable: false })
  @JoinColumn({ name: 'customerId' })
  customer: CustomerEntity

  @Column()
  petId: number

  @ManyToOne(() => PetEntity, { nullable: false })
  @JoinColumn({ name: 'petId' })
  pet: PetEntity

  @Column({ length: 30, nullable: true })
  visitType: string

  @Column({ length: 200, nullable: true })
  reason: string

  @Column({ nullable: true })
  doctorId: number

  @ManyToOne(() => DoctorEntity, { nullable: true })
  @JoinColumn({ name: 'doctorId' })
  doctor: DoctorEntity

  @Column({ type: 'datetime' })
  appointmentTime: string

  @Column({ type: 'datetime', nullable: true })
  checkinTime: string

  @Column({ type: 'tinyint', default: 1 })
  status: number

  @Column({ length: 200, nullable: true })
  remark: string
}
