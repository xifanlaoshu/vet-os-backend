import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { CommonEntity } from '~/common/entity/common.entity'
import { DoctorEntity } from './doctor.entity'
import { ShiftEntity } from './shift.entity'

@Index('idx_vpet_staff_schedule_date', ['scheduleDate'])
@Index('idx_vpet_staff_schedule_doctor_date', ['doctorId', 'scheduleDate'], { unique: true })
@Entity('vpet_staff_schedule')
export class StaffScheduleEntity extends CommonEntity {
  @Column()
  doctorId: number

  @ManyToOne(() => DoctorEntity, { nullable: false })
  @JoinColumn({ name: 'doctorId' })
  doctor: DoctorEntity

  @Column({ type: 'date' })
  scheduleDate: string

  @Column({ type: 'int', nullable: true })
  shiftId: number | null

  @ManyToOne(() => ShiftEntity, { nullable: true })
  @JoinColumn({ name: 'shiftId' })
  shift: ShiftEntity | null

  @Column({ length: 200, nullable: true })
  remark: string
}
