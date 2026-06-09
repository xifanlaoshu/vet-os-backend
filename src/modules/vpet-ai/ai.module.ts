import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PetEntity } from '../vpet-pet/entities/pet.entity'
import { PrescriptionEntity } from '../vpet-prescription/entities/prescription.entity'
import { RxDetailEntity } from '../vpet-prescription/entities/rx-detail.entity'
import { VisitEntity } from '../vpet-visit/entities/visit.entity'
import { AiController } from './ai.controller'
import { AiService } from './ai.service'
import { AiLogEntity } from './entities/ai-log.entity'

@Module({
  imports: [TypeOrmModule.forFeature([AiLogEntity, PrescriptionEntity, RxDetailEntity, VisitEntity, PetEntity])],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService, TypeOrmModule],
})
export class VpetAiModule {}
