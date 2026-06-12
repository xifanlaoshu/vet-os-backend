import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { AppointmentEntity } from '../vpet-appointment/entities/appointment.entity'
import { DoctorEntity } from '../vpet-appointment/entities/doctor.entity'
import { BillingPaymentEntity } from '../vpet-billing/entities/billing-payment.entity'
import { CustomerEntity } from '../vpet-customer/entities/customer.entity'
import { HospitalizationEntity } from '../vpet-hospitalization/entities/hospitalization.entity'
import { DrugEntity } from '../vpet-pharmacy/entities/drug.entity'
import { PharmacyService } from '../vpet-pharmacy/pharmacy.service'
import { PrescriptionEntity } from '../vpet-prescription/entities/prescription.entity'
import { ReminderEntity } from '../vpet-reminder/entities/reminder.entity'
import { ChronicCaseEntity } from '../vpet-visit/entities/chronic-case.entity'
import { ChronicFollowupEntity } from '../vpet-visit/entities/chronic-followup.entity'
import { VisitEntity } from '../vpet-visit/entities/visit.entity'

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(AppointmentEntity)
    private appointmentRepository: Repository<AppointmentEntity>,
    @InjectRepository(DoctorEntity)
    private doctorRepository: Repository<DoctorEntity>,
    @InjectRepository(VisitEntity)
    private visitRepository: Repository<VisitEntity>,
    @InjectRepository(BillingPaymentEntity)
    private paymentRepository: Repository<BillingPaymentEntity>,
    @InjectRepository(PrescriptionEntity)
    private prescriptionRepository: Repository<PrescriptionEntity>,
    @InjectRepository(CustomerEntity)
    private customerRepository: Repository<CustomerEntity>,
    @InjectRepository(HospitalizationEntity)
    private hospitalizationRepository: Repository<HospitalizationEntity>,
    @InjectRepository(ReminderEntity)
    private reminderRepository: Repository<ReminderEntity>,
    @InjectRepository(ChronicCaseEntity)
    private chronicCaseRepository: Repository<ChronicCaseEntity>,
    @InjectRepository(ChronicFollowupEntity)
    private chronicFollowupRepository: Repository<ChronicFollowupEntity>,
    @InjectRepository(DrugEntity)
    private drugRepository: Repository<DrugEntity>,
    private pharmacyService: PharmacyService,
  ) {}

  async getDailySummary(date?: string, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const tenantId = context?.tenantId ?? 1
    const areaId = context?.areaId ?? 1
    const target = date ? new Date(date) : new Date()
    const start = new Date(target)
    start.setHours(0, 0, 0, 0)
    const end = new Date(target)
    end.setHours(23, 59, 59, 999)
    const dayText = start.toISOString().slice(0, 10)

    const [
      appointments,
      visits,
      payments,
      prescriptions,
      newCustomers,
      hospitalizedCount,
      remindersDue,
      lowStock,
    ] = await Promise.all([
      this.appointmentRepository.createQueryBuilder('a')
        .where('a.appointmentTime BETWEEN :start AND :end', { start, end })
        .andWhere('a.tenantId = :tenantId', { tenantId })
        .andWhere('a.areaId = :areaId', { areaId })
        .getMany(),
      this.visitRepository.createQueryBuilder('v')
        .where('v.createdAt BETWEEN :start AND :end', { start, end })
        .andWhere('v.tenantId = :tenantId', { tenantId })
        .andWhere('v.areaId = :areaId', { areaId })
        .getMany(),
      this.paymentRepository.createQueryBuilder('p')
        .where('p.paidAt BETWEEN :start AND :end', { start, end })
        .andWhere('p.tenantId = :tenantId', { tenantId })
        .andWhere('p.areaId = :areaId', { areaId })
        .andWhere('p.status = 1')
        .getMany(),
      this.prescriptionRepository.createQueryBuilder('rx')
        .where('rx.createdAt BETWEEN :start AND :end', { start, end })
        .andWhere('rx.tenantId = :tenantId', { tenantId })
        .andWhere('rx.areaId = :areaId', { areaId })
        .getMany(),
      this.customerRepository.createQueryBuilder('c')
        .where('c.createdAt BETWEEN :start AND :end', { start, end })
        .andWhere('c.tenantId = :tenantId', { tenantId })
        .getCount(),
      this.hospitalizationRepository.count({ where: { status: 1, tenantId, areaId } }),
      this.reminderRepository.createQueryBuilder('r')
        .where('r.dueDate = :dayText', { dayText })
        .andWhere('r.tenantId = :tenantId', { tenantId })
        .andWhere('r.areaId = :areaId', { areaId })
        .andWhere('r.status = 1')
        .getCount(),
      this.pharmacyService.getLowStock({ tenantId, areaId }),
    ])

    const revenue = payments.reduce((sum, item) => {
      const delta = Number(item.direction) === 2 ? -Number(item.amount) : Number(item.amount)
      return sum + delta
    }, 0)

    const completedVisits = visits.filter(item => Number(item.status) === 4)
    const activeAppointments = appointments.filter(item => Number(item.status) !== 4 && Number(item.doctorId) > 0)
    const staffPerformanceMap = activeAppointments.reduce<Record<string, {
      appointmentCount: number
      checkedInCount: number
      completedAppointmentCount: number
    }>>((acc, item) => {
      const key = String(item.doctorId)
      if (!acc[key]) {
        acc[key] = {
          appointmentCount: 0,
          checkedInCount: 0,
          completedAppointmentCount: 0,
        }
      }
      acc[key].appointmentCount += 1
      if (Number(item.status) === 2)
        acc[key].checkedInCount += 1
      if (Number(item.status) === 3)
        acc[key].completedAppointmentCount += 1
      return acc
    }, {})

    const rankedDoctors = Object.entries(staffPerformanceMap)
      .sort((a, b) => b[1].appointmentCount - a[1].appointmentCount)
    const doctorIds = rankedDoctors
      .map(([doctorId]) => Number(doctorId))
      .filter(doctorId => doctorId > 0)
    const doctorRows = doctorIds.length
      ? await this.doctorRepository.find({ where: { id: In(doctorIds), tenantId } })
      : []
    const doctorNameMap = new Map(doctorRows.map(doctor => [Number(doctor.id), doctor.name]))
    const doctorRanking = rankedDoctors.map(([doctorId, stats]) => {
      const id = Number(doctorId)
      const doctorName = doctorNameMap.get(id) || ''
      return {
        doctorId: id || null,
        doctorResolvedName: doctorName,
        doctorName,
        appointmentCount: stats.appointmentCount,
        checkedInCount: stats.checkedInCount,
        completedAppointmentCount: stats.completedAppointmentCount,
        visitCount: stats.appointmentCount,
      }
    })

    return {
      date: dayText,
      overview: {
        appointmentCount: appointments.length,
        checkedInCount: appointments.filter(item => Number(item.status) === 2).length,
        completedAppointmentCount: appointments.filter(item => Number(item.status) === 3).length,
        visitCount: visits.length,
        completedVisitCount: completedVisits.length,
        prescriptionCount: prescriptions.length,
        revenue,
        newCustomerCount: newCustomers,
        hospitalizedCount,
        remindersDue,
      },
      doctorRanking,
      lowStock: lowStock.slice(0, 10),
    }
  }

  async getChronicSummary(context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const tenantId = context?.tenantId ?? 1
    const areaId = context?.areaId ?? 1
    const [activeCases, pendingReviews, recentFollowups] = await Promise.all([
      this.chronicCaseRepository.count({ where: { status: 1, tenantId, areaId } }),
      this.chronicCaseRepository.createQueryBuilder('c')
        .where('c.status = 1')
        .andWhere('c.tenantId = :tenantId', { tenantId })
        .andWhere('c.areaId = :areaId', { areaId })
        .andWhere('c.nextReviewDate IS NOT NULL')
        .andWhere('c.nextReviewDate <= :today', { today: new Date().toISOString().slice(0, 10) })
        .getCount(),
      this.chronicFollowupRepository.find({
        where: { tenantId, areaId },
        relations: ['chronicCase'],
        order: { reviewDate: 'DESC' },
        take: 20,
      }),
    ])

    return {
      overview: {
        activeCases,
        pendingReviews,
        recentFollowupCount: recentFollowups.length,
      },
      recentFollowups,
    }
  }
}
