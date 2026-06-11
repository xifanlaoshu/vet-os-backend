import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Brackets, FindOptionsWhere, Repository } from 'typeorm'
import { BusinessException } from '~/common/exceptions/biz.exception'
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
  ) {
    const { page = 1, pageSize = 10, status, doctorId, date, keyword } = params
    const scopedDoctorId = await this.resolveScopedDoctorId(params.scope, currentUserId)
    if (params.scope === 'currentStaff' && !scopedDoctorId)
      return { items: [], meta: { totalItems: 0, itemCount: 0, itemsPerPage: pageSize, totalPages: 0, currentPage: page } }
    const qb = this.appointmentRepository.createQueryBuilder('a')
      .leftJoinAndSelect('a.customer', 'customer')
      .leftJoinAndSelect('a.pet', 'pet')
      .leftJoinAndSelect('a.doctor', 'doctor')

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

  async create(dto: CreateAppointmentDto): Promise<AppointmentEntity> {
    await this.validateCustomerPetRelation(dto.customerId, dto.petId)
    await this.validateDoctor(dto.doctorId)
    await this.validateDoctorSchedule(dto.doctorId, dto.appointmentTime)
    const appt = this.appointmentRepository.create(dto)
    return this.appointmentRepository.save(appt)
  }

  async update(id: number, dto: UpdateAppointmentDto): Promise<void> {
    if (
      dto.customerId !== undefined
      || dto.petId !== undefined
      || dto.doctorId !== undefined
      || dto.appointmentTime !== undefined
    ) {
      const current = await this.appointmentRepository.findOneBy({ id })
      if (!current)
        throw new BusinessException('Appointment not found')
      if (dto.customerId !== undefined || dto.petId !== undefined) {
        await this.validateCustomerPetRelation(
          dto.customerId ?? current.customerId,
          dto.petId ?? current.petId,
        )
      }
      await this.validateDoctor(dto.doctorId)
      await this.validateDoctorSchedule(
        dto.doctorId ?? current.doctorId,
        dto.appointmentTime ?? current.appointmentTime,
      )
    }
    await this.appointmentRepository.update(id, dto)
  }

  async checkin(id: number, options: { scope?: string, currentUserId?: number } = {}) {
    const appointment = await this.appointmentRepository.findOneBy({ id })
    if (!appointment)
      throw new BusinessException('Appointment not found')
    const scopedDoctorId = await this.resolveScopedDoctorId(options.scope, options.currentUserId)
    if (options.scope === 'currentStaff') {
      if (!scopedDoctorId)
        throw new BusinessException('Current user is not linked to medical staff')
      if (Number(appointment.doctorId) !== Number(scopedDoctorId))
        throw new BusinessException('Appointment does not belong to current medical staff')
    }
    if (appointment.status === 4)
      throw new BusinessException('Canceled appointment cannot check in')

    const existingVisit = await this.visitService.findByAppointmentId(id)
    if (existingVisit) {
      if (appointment.status !== 2) {
        await this.appointmentRepository.update(id, {
          status: 2,
          checkinTime: appointment.checkinTime ?? new Date().toISOString(),
        })
      }
      return existingVisit
    }

    const doctor = appointment.doctorId
      ? await this.doctorRepository.findOneBy({ id: appointment.doctorId })
      : null

    await this.appointmentRepository.update(id, {
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
    })
  }

  async cancel(id: number): Promise<void> {
    await this.appointmentRepository.update(id, { status: 4 })
  }

  async doctorList(dto: QueryDoctorDto) {
    const { page = 1, pageSize = 10, keyword, department, position, status, bookable, name, phone } = dto
    const qb = this.doctorRepository.createQueryBuilder('d')
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

  async createDoctor(dto: CreateDoctorDto): Promise<DoctorEntity> {
    await this.validateDoctorUser(dto.userId)
    const doctor = this.doctorRepository.create(dto)
    return this.doctorRepository.save(doctor)
  }

  async updateDoctor(id: number, dto: UpdateDoctorDto): Promise<void> {
    await this.validateDoctorUser(dto.userId)
    await this.doctorRepository.update(id, dto)
  }

  async deleteDoctor(id: number): Promise<void> {
    await this.doctorRepository.delete(id)
  }

  async getDoctors(bookableOnly = false): Promise<DoctorEntity[]> {
    const where: FindOptionsWhere<DoctorEntity> = { status: 1 }
    if (bookableOnly)
      where.bookable = 1
    return this.doctorRepository.find({
      where,
      order: { position: 'ASC', name: 'ASC' },
    })
  }

  async shiftList(dto: QueryShiftDto) {
    const { page = 1, pageSize = 10, keyword, code, name, status } = dto
    const qb = this.shiftRepository.createQueryBuilder('s')
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

  async getActiveShifts() {
    return this.shiftRepository.find({
      where: { status: 1 },
      order: { startTime: 'ASC', code: 'ASC' },
    })
  }

  async createShift(dto: CreateShiftDto) {
    await this.ensureShiftCodeAvailable(dto.code)
    return this.shiftRepository.save(this.shiftRepository.create({
      ...dto,
      color: dto.color || '#1677ff',
      status: dto.status ?? 1,
    }))
  }

  async updateShift(id: number, dto: UpdateShiftDto) {
    const current = await this.shiftRepository.findOneBy({ id })
    if (!current)
      throw new BusinessException('Shift not found')
    if (dto.code && dto.code !== current.code)
      await this.ensureShiftCodeAvailable(dto.code, id)
    await this.shiftRepository.update(id, dto)
  }

  async deleteShift(id: number) {
    const used = await this.staffScheduleRepository.count({ where: { shiftId: id } })
    if (used > 0)
      throw new BusinessException('Shift is used by schedules and cannot be deleted')
    await this.shiftRepository.delete(id)
  }

  async monthSchedules(dto: QueryStaffScheduleDto) {
    const { start, end } = this.resolveMonthRange(dto.month)
    const [doctors, shifts, schedules] = await Promise.all([
      this.getDoctors(false),
      this.getActiveShifts(),
      this.staffScheduleRepository.createQueryBuilder('s')
        .leftJoinAndSelect('s.shift', 'shift')
        .where('s.scheduleDate BETWEEN :start AND :end', { start, end })
        .getMany(),
    ])
    return {
      month: dto.month,
      doctors,
      shifts,
      schedules,
    }
  }

  async saveStaffSchedule(dto: SaveStaffScheduleDto) {
    const doctor = await this.doctorRepository.findOneBy({ id: dto.doctorId, status: 1 })
    if (!doctor)
      throw new BusinessException('Medical staff not found')

    const existing = await this.staffScheduleRepository.findOne({
      where: { doctorId: dto.doctorId, scheduleDate: dto.scheduleDate },
    })

    if (!dto.shiftId) {
      if (existing)
        await this.staffScheduleRepository.delete(existing.id)
      return null
    }

    const shift = await this.shiftRepository.findOneBy({ id: dto.shiftId, status: 1 })
    if (!shift)
      throw new BusinessException('Shift not found')

    const entity = this.staffScheduleRepository.create({
      ...(existing || {}),
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

  private async validateCustomerPetRelation(customerId: number, petId: number) {
    const pet = await this.petRepository.findOneBy({ id: petId })
    if (!pet)
      throw new BusinessException('Pet not found')
    if (Number(pet.customerId) !== Number(customerId)) {
      throw new BusinessException('Pet does not belong to the selected customer')
    }
  }

  private async validateDoctor(doctorId?: number) {
    if (!doctorId)
      return
    const doctor = await this.doctorRepository.findOneBy({ id: doctorId, status: 1 })
    if (!doctor)
      throw new BusinessException('Medical staff not found')
    if (Number(doctor.bookable) !== 1)
      throw new BusinessException('Medical staff is not bookable')
  }

  private async validateDoctorSchedule(doctorId?: number, appointmentTime?: string) {
    if (!doctorId || !appointmentTime)
      return
    const { date, time } = this.parseAppointmentDateTime(appointmentTime)
    const schedule = await this.staffScheduleRepository.findOne({
      where: { doctorId, scheduleDate: date },
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

  private async resolveScopedDoctorId(scope?: string, currentUserId?: number) {
    if (scope !== 'currentStaff')
      return undefined
    if (!currentUserId)
      return null
    const doctor = await this.doctorRepository.findOne({
      where: { userId: currentUserId, status: 1 },
    })
    return doctor?.id ?? null
  }

  private async ensureShiftCodeAvailable(code?: string, excludeId?: number) {
    if (!code)
      return
    const existing = await this.shiftRepository.findOneBy({ code })
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
