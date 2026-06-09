import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AppointmentEntity } from '../vpet-appointment/entities/appointment.entity'
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

  async getDailySummary(date?: string) {
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
      this.appointmentRepository.count({ where: { } }).then(async () =>
        this.appointmentRepository.createQueryBuilder('a')
          .where('a.appointmentTime BETWEEN :start AND :end', { start, end })
          .getMany(),
      ),
      this.visitRepository.createQueryBuilder('v')
        .where('v.createdAt BETWEEN :start AND :end', { start, end })
        .getMany(),
      this.paymentRepository.createQueryBuilder('p')
        .where('p.paidAt BETWEEN :start AND :end', { start, end })
        .andWhere('p.status = 1')
        .getMany(),
      this.prescriptionRepository.createQueryBuilder('rx')
        .where('rx.createdAt BETWEEN :start AND :end', { start, end })
        .getMany(),
      this.customerRepository.createQueryBuilder('c')
        .where('c.createdAt BETWEEN :start AND :end', { start, end })
        .getCount(),
      this.hospitalizationRepository.count({ where: { status: 1 } }),
      this.reminderRepository.createQueryBuilder('r')
        .where('r.dueDate = :dayText', { dayText })
        .andWhere('r.status = 1')
        .getCount(),
      this.pharmacyService.getLowStock(),
    ])

    const revenue = payments.reduce((sum, item) => {
      const delta = Number(item.direction) === 2 ? -Number(item.amount) : Number(item.amount)
      return sum + delta
    }, 0)

    const completedVisits = visits.filter(item => Number(item.status) === 4)
    const doctorMap = completedVisits.reduce<Record<string, number>>((acc, item) => {
      const key = String(item.doctorId || 0)
      acc[key] = Number(acc[key] || 0) + 1
      return acc
    }, {})

    const doctorRanking = await Promise.all(
      Object.entries(doctorMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(async ([doctorId, visitCount]) => ({
          doctorId: Number(doctorId),
          visitCount,
        })),
    )

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

  async getChronicSummary() {
    const [activeCases, pendingReviews, recentFollowups] = await Promise.all([
      this.chronicCaseRepository.count({ where: { status: 1 } }),
      this.chronicCaseRepository.createQueryBuilder('c')
        .where('c.status = 1')
        .andWhere('c.nextReviewDate IS NOT NULL')
        .andWhere('c.nextReviewDate <= :today', { today: new Date().toISOString().slice(0, 10) })
        .getCount(),
      this.chronicFollowupRepository.find({
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
