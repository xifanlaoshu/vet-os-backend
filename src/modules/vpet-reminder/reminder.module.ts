import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CustomerEntity } from '../vpet-customer/entities/customer.entity'
import { PetEntity } from '../vpet-pet/entities/pet.entity'
import { VisitEntity } from '../vpet-visit/entities/visit.entity'
import { ReminderEntity } from './entities/reminder.entity'
import { ReminderController } from './reminder.controller'
import { ReminderService } from './reminder.service'

@Module({
  imports: [TypeOrmModule.forFeature([ReminderEntity, CustomerEntity, PetEntity, VisitEntity])],
  controllers: [ReminderController],
  providers: [ReminderService],
  exports: [ReminderService, TypeOrmModule],
})
export class VpetReminderModule {}
