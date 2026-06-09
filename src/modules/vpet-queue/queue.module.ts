import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { VisitQueueEventEntity } from '~/modules/vpet-visit/entities/visit-queue-event.entity'
import { VisitEntity } from '~/modules/vpet-visit/entities/visit.entity'
import { QueueController } from './queue.controller'
import { QueueService } from './queue.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([VisitEntity, VisitQueueEventEntity]),
  ],
  controllers: [QueueController],
  providers: [QueueService],
  exports: [QueueService],
})
export class VpetQueueModule {}
