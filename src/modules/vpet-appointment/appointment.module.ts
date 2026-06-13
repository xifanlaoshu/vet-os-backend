import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UserAreaEntity } from '../system/tenant/user-area.entity'
import { UserEntity } from '../user/user.entity'
import { PetEntity } from '../vpet-pet/entities/pet.entity'
import { VpetVisitModule } from '../vpet-visit/visit.module'
import { AppointmentController } from './appointment.controller'
import { AppointmentService } from './appointment.service'
import { AppointmentEntity } from './entities/appointment.entity'
import { DoctorEntity } from './entities/doctor.entity'
import { ShiftEntity } from './entities/shift.entity'
import { StaffScheduleEntity } from './entities/staff-schedule.entity'

@Module({
  imports: [TypeOrmModule.forFeature([AppointmentEntity, DoctorEntity, PetEntity, UserEntity, UserAreaEntity, ShiftEntity, StaffScheduleEntity]), VpetVisitModule],
  controllers: [AppointmentController],
  providers: [AppointmentService],
  exports: [AppointmentService, TypeOrmModule],
})
export class VpetAppointmentModule {}
