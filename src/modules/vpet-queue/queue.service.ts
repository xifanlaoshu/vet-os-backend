import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { BusinessException } from '~/common/exceptions/biz.exception'
import { VisitQueueEventEntity } from '~/modules/vpet-visit/entities/visit-queue-event.entity'
import { VisitEntity } from '~/modules/vpet-visit/entities/visit.entity'

@Injectable()
export class QueueService {
  constructor(
    @InjectRepository(VisitEntity)
    private visitRepository: Repository<VisitEntity>,
    @InjectRepository(VisitQueueEventEntity)
    private queueEventRepository: Repository<VisitQueueEventEntity>,
  ) {}

  async getQueue(context: IAuthUser, doctorId?: number) {
    const qb = this.visitRepository.createQueryBuilder('v')
      .where('v.status IN (:...statuses)', { statuses: [1, 2] })
      .andWhere('v.tenantId = :tenantId', { tenantId: context.tenantId })
      .andWhere('v.areaId = :areaId', { areaId: context.areaId })
      .orderBy('v.status', 'ASC')
      .addOrderBy('v.createdAt', 'ASC')

    if (doctorId)
      qb.andWhere('v.doctorId = :doctorId', { doctorId })

    return qb.getMany()
  }

  async callNext(context: IAuthUser, doctorId: number, visitId?: number) {
    if (visitId) {
      const visit = await this.visitRepository.findOneBy({
        id: visitId,
        tenantId: context.tenantId,
        areaId: context.areaId,
      })
      if (!visit)
        throw new BusinessException('Visit not found')
      if (!visit.doctorId)
        throw new BusinessException('Visit has no assigned doctor')
      if (doctorId && Number(visit.doctorId) !== Number(doctorId)) {
        throw new BusinessException('Visit does not belong to the selected doctor')
      }
      if (Number(visit.status) === 2) {
        await this.requeueOtherCalledVisits(context, visit.doctorId, visit.id)
        return { visitId, status: 'called' }
      }
      if (Number(visit.status) !== 1) {
        throw new BusinessException('Only waiting visits can be called')
      }

      await this.requeueOtherCalledVisits(context, visit.doctorId, visit.id)

      await this.visitRepository.update({
        id: visitId,
        tenantId: context.tenantId,
        areaId: context.areaId,
      }, {
        status: 2,
        callTime: new Date().toISOString(),
      })
      await this.createQueueEvent(visitId, 2, visit.queueNumber, 'called', true)
      return { visitId, status: 'called' }
    }

    const nextVisit = await this.visitRepository.findOne({
      where: { doctorId, status: 1, tenantId: context.tenantId, areaId: context.areaId },
      order: { createdAt: 'ASC' },
    })

    if (!nextVisit)
      return { message: 'Queue is empty' }

    await this.requeueOtherCalledVisits(context, doctorId, nextVisit.id)

    await this.visitRepository.update({
      id: nextVisit.id,
      tenantId: context.tenantId,
      areaId: context.areaId,
    }, {
      status: 2,
      callTime: new Date().toISOString(),
    })
    await this.createQueueEvent(nextVisit.id, 2, nextVisit.queueNumber, 'called', true)

    return { visitId: nextVisit.id, status: 'called' }
  }

  async skip(context: IAuthUser, visitId: number) {
    const visit = await this.visitRepository.findOneBy({
      id: visitId,
      tenantId: context.tenantId,
      areaId: context.areaId,
    })
    if (!visit)
      throw new BusinessException('Visit not found')
    if (Number(visit.status) === 6)
      return { visitId, status: 'skipped' }
    if (![1, 2].includes(Number(visit.status))) {
      throw new BusinessException('Only waiting or called visits can be skipped')
    }
    await this.visitRepository.update({
      id: visitId,
      tenantId: context.tenantId,
      areaId: context.areaId,
    }, { status: 6 })
    await this.createQueueEvent(visitId, 5, visit.queueNumber, 'skipped', true)
    return { visitId, status: 'skipped' }
  }

  private async createQueueEvent(visitId: number, eventType: number, queueNo?: number | null, remark?: string, dedupeLatest = false) {
    if (dedupeLatest) {
      const latest = await this.queueEventRepository.findOne({
        where: { visitId },
        order: { eventTime: 'DESC', id: 'DESC' },
      })
      if (latest && Number(latest.eventType) === Number(eventType) && String(latest.remark || '') === String(remark || '')) {
        return
      }
    }

    await this.queueEventRepository.save(this.queueEventRepository.create({
      visitId,
      eventType,
      queueNo: queueNo ?? null,
      eventTime: new Date().toISOString(),
      remark: remark ?? null,
    }))
  }

  private async requeueOtherCalledVisits(context: IAuthUser, doctorId: number, currentVisitId: number) {
    const calledVisits = await this.visitRepository.find({
      where: { doctorId, status: 2, tenantId: context.tenantId, areaId: context.areaId },
      order: { createdAt: 'ASC' },
    })

    const staleCalledVisits = calledVisits.filter(item => Number(item.id) !== Number(currentVisitId))
    if (!staleCalledVisits.length)
      return

    await this.visitRepository
      .createQueryBuilder()
      .update(VisitEntity)
      .set({ status: 1, callTime: null })
      .where('doctorId = :doctorId', { doctorId })
      .andWhere('tenantId = :tenantId', { tenantId: context.tenantId })
      .andWhere('areaId = :areaId', { areaId: context.areaId })
      .andWhere('status = :status', { status: 2 })
      .andWhere('id != :currentVisitId', { currentVisitId })
      .execute()

    for (const visit of staleCalledVisits) {
      await this.createQueueEvent(visit.id, 1, visit.queueNumber, 'requeued')
    }
  }
}
