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
import { AppointmentEntity } from './entities/appointment.entity'
import { DoctorEntity } from './entities/doctor.entity'

@Injectable()
export class AppointmentService {
  constructor(
    @InjectRepository(AppointmentEntity)
    private appointmentRepository: Repository<AppointmentEntity>,
    @InjectRepository(DoctorEntity)
    private doctorRepository: Repository<DoctorEntity>,
    @InjectRepository(PetEntity)
    private petRepository: Repository<PetEntity>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    private visitService: VisitService,
  ) {}

  async list(params: { page?: number, pageSize?: number, status?: number, doctorId?: number, date?: string, keyword?: string }) {
    const { page = 1, pageSize = 10, status, doctorId, date, keyword } = params
    const qb = this.appointmentRepository.createQueryBuilder('a')
      .leftJoinAndSelect('a.customer', 'customer')
      .leftJoinAndSelect('a.pet', 'pet')
      .leftJoinAndSelect('a.doctor', 'doctor')

    if (status !== undefined)
      qb.andWhere('a.status = :status', { status })
    if (doctorId)
      qb.andWhere('a.doctorId = :doctorId', { doctorId })
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
    const appt = this.appointmentRepository.create(dto)
    return this.appointmentRepository.save(appt)
  }

  async update(id: number, dto: UpdateAppointmentDto): Promise<void> {
    if (dto.customerId !== undefined || dto.petId !== undefined || dto.doctorId !== undefined) {
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
    }
    await this.appointmentRepository.update(id, dto)
  }

  async checkin(id: number) {
    const appointment = await this.appointmentRepository.findOneBy({ id })
    if (!appointment)
      throw new BusinessException('Appointment not found')
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

  private async validateDoctorUser(userId?: number) {
    if (!userId)
      return
    const user = await this.userRepository.findOneBy({ id: userId })
    if (!user)
      throw new BusinessException('System user not found')
  }
}
