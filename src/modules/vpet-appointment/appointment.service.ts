import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Brackets, FindOptionsWhere, Repository } from 'typeorm'
import { BusinessException } from '~/common/exceptions/biz.exception'
import { requireTenantAreaContext, requireTenantContext } from '~/common/utils/tenant-context.util'
import { paginate } from '~/helper/paginate'
import { UserEntity } from '../user/user.entity'
import { PetEntity } from '../vpet-pet/entities/pet.entity'
import { VisitService } from '../vpet-visit/visit.service'
import { CreateAppointmentDto, UpdateAppointmentDto } from './dto/appointment.dto'
import { CreateDoctorDto, QueryDoctorDto, UpdateDoctorDto } from './dto/doctor.dto'
import { CreateShiftDto, QueryShiftDto, QueryStaffScheduleDto, SaveStaffScheduleDto, UpdateShiftDto } from './dto/shift.dto'
import { AppointmentEntity } from './entities/appointment.entity'
import { DoctorEntity } from './entities/doctor.entity'
import { ShiftEntity } from './entities/shift.entity'
import { StaffScheduleEntity } from './entities/staff-schedule.entity'

@Injectable()
export class AppointmentService {
  constructor(
    @InjectRepository(AppointmentEntity)
    private appointmentRepository: Repository<AppointmentEntity>,
    @InjectRepository(DoctorEntity)
    private doctorRepository: Repository<DoctorEntity>,
    @InjectRepository(ShiftEntity)
    private shiftRepository: Repository<ShiftEntity>,
    @InjectRepository(StaffScheduleEntity)
    private staffScheduleRepository: Repository<StaffScheduleEntity>,
    @InjectRepository(PetEntity)
    private petRepository: Repository<PetEntity>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    private visitService: VisitService,
  ) {}

  async list(
    params: { page?: number, pageSize?: number, status?: number, doctorId?: number, date?: string, keyword?: string, scope?: string },
    currentUserId?: number,
    context?: Pick<IAuthUser, 'tenantId' | 'areaId'>,
  ) {
    const { page = 1, pageSize = 10, status, doctorId, date, keyword } = params
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const scopedDoctorId = await this.resolveScopedDoctorId(params.scope, currentUserId, tenantId)
    if (params.scope === 'currentStaff' && !scopedDoctorId)
      return { items: [], meta: { totalItems: 0, itemCount: 0, itemsPerPage: pageSize, totalPages: 0, currentPage: page } }
    const qb = this.appointmentRepository.createQueryBuilder('a')
      .leftJoinAndSelect('a.customer', 'customer')
      .leftJoinAndSelect('a.pet', 'pet')
      .leftJoinAndSelect('a.doctor', 'doctor')
      .andWhere('a.tenantId = :tenantId', { tenantId })
      .andWhere('a.areaId = :areaId', { areaId })

    if (status !== undefined)
      qb.andWhere('a.status = :status', { status })
    const effectiveDoctorId = scopedDoctorId ?? doctorId
    if (effectiveDoctorId)
      qb.andWhere('a.doctorId = :doctorId', { doctorId: effectiveDoctorId })
    if (date) {
      const start = `${date} 00:00:00`
      const end = `${date} 23:59:59`
      qb.andWhere('a.appointmentTime BETWEEN :start AND :end', { start, end })
    }
    if (keyword) {
      qb.andWhere(new Brackets((subQb) => {
        subQb
          .where('customer.name LIKE :keyword', { keyword: `%${keyword}%` })
          .orWhere('pet.name LIKE :keyword', { keyword: `%${keyword}%` })
          .orWhere('a.reason LIKE :keyword', { keyword: `%${keyword}%` })
          .orWhere('a.remark LIKE :keyword', { keyword: `%${keyword}%` })
      }))
    }

    qb.orderBy('a.appointmentTime', 'ASC')
    return paginate(qb, { page, pageSize })
  }

  async create(dto: CreateAppointmentDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>): Promise<AppointmentEntity> {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    await this.validateCustomerPetRelation(dto.customerId, dto.petId, tenantId)
    await this.validateDoctor(dto.doctorId, tenantId)
    await this.validateDoctorSchedule(dto.doctorId, dto.appointmentTime, tenantId, areaId)
    const appt = this.appointmentRepository.create({ ...dto, tenantId, areaId })
    return this.appointmentRepository.save(appt)
  }

  async update(id: number, dto: UpdateAppointmentDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>): Promise<void> {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    if (
      dto.customerId !== undefined
      || dto.petId !== undefined
      || dto.doctorId !== undefined
      || dto.appointmentTime !== undefined
    ) {
      const current = await this.appointmentRepository.findOneBy({ id, tenantId, areaId })
      if (!current)
        throw new BusinessException('Appointment not found')
      if (dto.customerId !== undefined || dto.petId !== undefined) {
        await this.validateCustomerPetRelation(
          dto.customerId ?? current.customerId,
          dto.petId ?? current.petId,
          tenantId,
        )
      }
      await this.validateDoctor(dto.doctorId, tenantId)
      await this.validateDoctorSchedule(
        dto.doctorId ?? current.doctorId,
        dto.appointmentTime ?? current.appointmentTime,
        tenantId,
        areaId,
      )
    }
    await this.appointmentRepository.update({ id, tenantId, areaId }, dto)
  }

  async checkin(id: number, options: { scope?: string, currentUserId?: number, tenantId?: number, areaId?: number } = {}) {
    const { tenantId, areaId } = requireTenantAreaContext(options)
    const appointment = await this.appointmentRepository.findOneBy({ id, tenantId, areaId })
    if (!appointment)
      throw new BusinessException('Appointment not found')
    const scopedDoctorId = await this.resolveScopedDoctorId(options.scope, options.currentUserId, tenantId)
    if (options.scope === 'currentStaff') {
      if (!scopedDoctorId)
        throw new BusinessException('Current user is not linked to medical staff')
      if (Number(appointment.doctorId) !== Number(scopedDoctorId))
        throw new BusinessException('Appointment does not belong to current medical staff')
    }
    if (appointment.status === 4)
      throw new BusinessException('Canceled appointment cannot check in')

    const existingVisit = await this.visitService.findByAppointmentId(id, { tenantId, areaId })
    if (existingVisit) {
      if (appointment.status !== 2) {
        await this.appointmentRepository.update({ id, tenantId, areaId }, {
          status: 2,
          checkinTime: appointment.checkinTime ?? new Date().toISOString(),
        })
      }
      return existingVisit
    }

    const doctor = appointment.doctorId
      ? await this.doctorRepository.findOneBy({ id: appointment.doctorId, tenantId })
      : null

    await this.appointmentRepository.update({ id, tenantId, areaId }, {
      status: 2,
      checkinTime: new Date().toISOString(),
    })

    return this.visitService.createVisit({
      appointmentId: appointment.id,
      petId: appointment.petId,
      customerId: appointment.customerId,
      type: this.mapVisitType(appointment.visitType),
      department: doctor?.department ?? undefined,
      doctorId: appointment.doctorId,
      tenantId,
      areaId,
    } as any)
  }

  async cancel(id: number, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>): Promise<void> {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    await this.appointmentRepository.update({
      id,
      tenantId,
      areaId,
    }, { status: 4 })
  }

  async doctorList(dto: QueryDoctorDto, context?: Pick<IAuthUser, 'tenantId'>) {
    const { page = 1, pageSize = 10, keyword, department, position, status, bookable, name, phone } = dto
    const { tenantId } = requireTenantContext(context)
    const qb = this.doctorRepository.createQueryBuilder('d')
      .andWhere('d.tenantId = :tenantId', { tenantId })
    if (keyword) {
      qb.andWhere('(d.name LIKE :kw OR d.phone LIKE :kw)', { kw: `%${keyword}%` })
    }
    if (name)
      qb.andWhere('d.name LIKE :name', { name: `%${name}%` })
    if (phone)
      qb.andWhere('d.phone LIKE :phone', { phone: `%${phone}%` })
    if (department)
      qb.andWhere('d.department = :department', { department })
    if (position)
      qb.andWhere('d.position = :position', { position })
    if (status !== undefined)
      qb.andWhere('d.status = :status', { status })
    if (bookable !== undefined)
      qb.andWhere('d.bookable = :bookable', { bookable })
    qb.orderBy('d.createdAt', 'DESC')
    return paginate(qb, { page, pageSize })
  }

  async createDoctor(dto: CreateDoctorDto, context?: Pick<IAuthUser, 'tenantId'>): Promise<DoctorEntity> {
    const { tenantId } = requireTenantContext(context)
    await this.validateDoctorUser(dto.userId)
    const doctor = this.doctorRepository.create({ ...dto, tenantId })
    return this.doctorRepository.save(doctor)
  }

  async updateDoctor(id: number, dto: UpdateDoctorDto, context?: Pick<IAuthUser, 'tenantId'>): Promise<void> {
    const { tenantId } = requireTenantContext(context)
    await this.validateDoctorUser(dto.userId)
    await this.doctorRepository.update({ id, tenantId }, dto)
  }

  async deleteDoctor(id: number, context?: Pick<IAuthUser, 'tenantId'>): Promise<void> {
    const { tenantId } = requireTenantContext(context)
    await this.doctorRepository.delete({ id, tenantId })
  }

  async getDoctors(bookableOnly = false, context?: Pick<IAuthUser, 'tenantId'>): Promise<DoctorEntity[]> {
    const { tenantId } = requireTenantContext(context)
    const where: FindOptionsWhere<DoctorEntity> = { status: 1, tenantId }
    if (bookableOnly)
      where.bookable = 1
    return this.doctorRepository.find({
      where,
      order: { position: 'ASC', name: 'ASC' },
    })
  }

  async shiftList(dto: QueryShiftDto, context?: Pick<IAuthUser, 'tenantId'>) {
    const { page = 1, pageSize = 10, keyword, code, name, status } = dto
    const { tenantId } = requireTenantContext(context)
    const qb = this.shiftRepository.createQueryBuilder('s')
      .andWhere('s.tenantId = :tenantId', { tenantId })
    if (keyword) {
      qb.andWhere('(s.code LIKE :kw OR s.name LIKE :kw OR s.remark LIKE :kw)', { kw: `%${keyword}%` })
    }
    if (code)
      qb.andWhere('s.code LIKE :code', { code: `%${code}%` })
    if (name)
      qb.andWhere('s.name LIKE :name', { name: `%${name}%` })
    if (status !== undefined)
      qb.andWhere('s.status = :status', { status })
    qb.orderBy('s.status', 'DESC').addOrderBy('s.startTime', 'ASC').addOrderBy('s.code', 'ASC')
    return paginate(qb, { page, pageSize })
  }

  async getActiveShifts(context?: Pick<IAuthUser, 'tenantId'>) {
    const { tenantId } = requireTenantContext(context)
    return this.shiftRepository.find({
      where: { status: 1, tenantId },
      order: { startTime: 'ASC', code: 'ASC' },
    })
  }

  async createShift(dto: CreateShiftDto, context?: Pick<IAuthUser, 'tenantId'>) {
    const { tenantId } = requireTenantContext(context)
    await this.ensureShiftCodeAvailable(dto.code, undefined, tenantId)
    return this.shiftRepository.save(this.shiftRepository.create({
      ...dto,
      tenantId,
      color: dto.color || '#1677ff',
      status: dto.status ?? 1,
    }))
  }

  async updateShift(id: number, dto: UpdateShiftDto, context?: Pick<IAuthUser, 'tenantId'>) {
    const { tenantId } = requireTenantContext(context)
    const current = await this.shiftRepository.findOneBy({ id, tenantId })
    if (!current)
      throw new BusinessException('Shift not found')
    if (dto.code && dto.code !== current.code)
      await this.ensureShiftCodeAvailable(dto.code, id, tenantId)
    await this.shiftRepository.update({ id, tenantId }, dto)
  }

  async deleteShift(id: number, context?: Pick<IAuthUser, 'tenantId'>) {
    const { tenantId } = requireTenantContext(context)
    const used = await this.staffScheduleRepository.count({ where: { shiftId: id, tenantId } })
    if (used > 0)
      throw new BusinessException('Shift is used by schedules and cannot be deleted')
    await this.shiftRepository.delete({ id, tenantId })
  }

  async monthSchedules(dto: QueryStaffScheduleDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const { start, end } = this.resolveMonthRange(dto.month)
    const [doctors, shifts, schedules] = await Promise.all([
      this.getDoctors(false, { tenantId }),
      this.getActiveShifts({ tenantId }),
      this.staffScheduleRepository.createQueryBuilder('s')
        .leftJoinAndSelect('s.shift', 'shift')
        .where('s.tenantId = :tenantId', { tenantId })
        .andWhere('s.areaId = :areaId', { areaId })
        .andWhere('s.scheduleDate BETWEEN :start AND :end', { start, end })
        .getMany(),
    ])
    return {
      month: dto.month,
      doctors,
      shifts,
      schedules,
    }
  }

  async saveStaffSchedule(dto: SaveStaffScheduleDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const doctor = await this.doctorRepository.findOneBy({ id: dto.doctorId, status: 1, tenantId })
    if (!doctor)
      throw new BusinessException('Medical staff not found')

    const existing = await this.staffScheduleRepository.findOne({
      where: { doctorId: dto.doctorId, scheduleDate: dto.scheduleDate, tenantId, areaId },
    })

    if (!dto.shiftId) {
      if (existing)
        await this.staffScheduleRepository.delete(existing.id)
      return null
    }

    const shift = await this.shiftRepository.findOneBy({ id: dto.shiftId, status: 1, tenantId })
    if (!shift)
      throw new BusinessException('Shift not found')

    const entity = this.staffScheduleRepository.create({
      ...(existing || {}),
      tenantId,
      areaId,
      doctorId: dto.doctorId,
      scheduleDate: dto.scheduleDate,
      shiftId: dto.shiftId,
      remark: dto.remark,
    })
    return this.staffScheduleRepository.save(entity)
  }

  private mapVisitType(value?: string) {
    if (!value)
      return 1
    const normalized = value.toLowerCase()
    if (normalized.includes('follow') || normalized.includes('return') || normalized.includes('review'))
      return 2
    return 1
  }

  private async validateCustomerPetRelation(customerId: number, petId: number, tenantId: number) {
    const pet = await this.petRepository.findOneBy({ id: petId, tenantId })
    if (!pet)
      throw new BusinessException('Pet not found')
    if (Number(pet.customerId) !== Number(customerId)) {
      throw new BusinessException('Pet does not belong to the selected customer')
    }
  }

  private async validateDoctor(doctorId: number | undefined, tenantId: number) {
    if (!doctorId)
      return
    const doctor = await this.doctorRepository.findOneBy({ id: doctorId, status: 1, tenantId })
    if (!doctor)
      throw new BusinessException('Medical staff not found')
    if (Number(doctor.bookable) !== 1)
      throw new BusinessException('Medical staff is not bookable')
  }

  private async validateDoctorSchedule(doctorId: number | undefined, appointmentTime: string | undefined, tenantId: number, areaId: number) {
    if (!doctorId || !appointmentTime)
      return
    const { date, time } = this.parseAppointmentDateTime(appointmentTime)
    const schedule = await this.staffScheduleRepository.findOne({
      where: { doctorId, scheduleDate: date, tenantId, areaId },
      relations: ['shift'],
    })
    if (!schedule?.shift || Number(schedule.shift.status) !== 1)
      throw new BusinessException('Medical staff is not scheduled at the appointment time')
    if (!this.isTimeInShift(time, schedule.shift.startTime, schedule.shift.endTime))
      throw new BusinessException('Appointment time is outside the medical staff shift')
  }

  private parseAppointmentDateTime(value: string) {
    const text = String(value)
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
      return {
        date: text.slice(0, 10),
        time: this.normalizeTime(text.slice(11, 19) || '00:00:00'),
      }
    }
    const date = new Date(value)
    if (Number.isNaN(date.getTime()))
      throw new BusinessException('Invalid appointment time')
    return {
      date: date.toISOString().slice(0, 10),
      time: this.normalizeTime(date.toISOString().slice(11, 19)),
    }
  }

  private normalizeTime(value?: string) {
    const [hour = '00', minute = '00', second = '00'] = String(value || '00:00:00').split(':')
    return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}`
  }

  private isTimeInShift(time: string, startTime: string, endTime: string) {
    const current = this.normalizeTime(time)
    const start = this.normalizeTime(startTime)
    const end = this.normalizeTime(endTime)
    if (start === end)
      return true
    if (start < end)
      return current >= start && current < end
    return current >= start || current < end
  }

  private async validateDoctorUser(userId?: number) {
    if (!userId)
      return
    const user = await this.userRepository.findOneBy({ id: userId })
    if (!user)
      throw new BusinessException('System user not found')
  }

  private async resolveScopedDoctorId(scope: string | undefined, currentUserId: number | undefined, tenantId: number) {
    if (scope !== 'currentStaff')
      return undefined
    if (!currentUserId)
      return null
    const doctor = await this.doctorRepository.findOne({
      where: { userId: currentUserId, status: 1, tenantId },
    })
    return doctor?.id ?? null
  }

  private async ensureShiftCodeAvailable(code: string | undefined, excludeId: number | undefined, tenantId: number) {
    if (!code)
      return
    const existing = await this.shiftRepository.findOneBy({ code, tenantId })
    if (existing && existing.id !== excludeId)
      throw new BusinessException('Shift code already exists')
  }

  private resolveMonthRange(month: string) {
    const normalized = /^\d{4}-\d{2}$/.test(month) ? month : new Date().toISOString().slice(0, 7)
    const [year, monthIndex] = normalized.split('-').map(Number)
    const start = `${normalized}-01`
    const endDate = new Date(year, monthIndex, 0).getDate()
    const end = `${normalized}-${String(endDate).padStart(2, '0')}`
    return { start, end }
  }
}
