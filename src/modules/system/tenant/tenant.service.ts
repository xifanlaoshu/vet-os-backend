import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Brackets, Repository } from 'typeorm'
import { AppConfig, IAppConfig } from '~/config'
import { paginate } from '~/helper/paginate'

import { TenantAreaEntity } from './tenant-area.entity'
import { DEFAULT_AREA_ID, DEFAULT_TENANT_ID } from './tenant.constants'
import { TenantAreaDto, TenantAreaQueryDto, TenantDto, TenantQueryDto, UserAreaGrantDto } from './tenant.dto'
import { TenantEntity } from './tenant.entity'
import { UserAreaEntity } from './user-area.entity'

export interface TenantAreaOption {
  tenantId: number
  tenantName: string
  areaId: number
  areaName: string
  defaultArea: boolean
}

@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(TenantEntity)
    private readonly tenantRepository: Repository<TenantEntity>,
    @InjectRepository(TenantAreaEntity)
    private readonly areaRepository: Repository<TenantAreaEntity>,
    @InjectRepository(UserAreaEntity)
    private readonly userAreaRepository: Repository<UserAreaEntity>,
    @Inject(AppConfig.KEY) private readonly appConfig: IAppConfig,
  ) {}

  async getTenant(id = DEFAULT_TENANT_ID) {
    return this.tenantRepository.findOneBy({ id, status: 1 })
  }

  async getArea(id = DEFAULT_AREA_ID) {
    return this.areaRepository.findOneBy({ id, status: 1 })
  }

  async listTenants(dto: TenantQueryDto) {
    const { keyword, status } = dto
    const qb = this.tenantRepository.createQueryBuilder('tenant')

    if (keyword) {
      qb.andWhere(new Brackets(builder => builder
        .where('tenant.code LIKE :keyword', { keyword: `%${keyword}%` })
        .orWhere('tenant.name LIKE :keyword', { keyword: `%${keyword}%` })
        .orWhere('tenant.shortName LIKE :keyword', { keyword: `%${keyword}%` })
        .orWhere('tenant.contactPhone LIKE :keyword', { keyword: `%${keyword}%` }),
      ))
    }
    if (status !== undefined)
      qb.andWhere('tenant.status = :status', { status })

    qb.orderBy('tenant.createdAt', 'DESC')
    return paginate(qb, { page: dto.page, pageSize: dto.pageSize })
  }

  async tenantOptions() {
    return this.tenantRepository.find({
      where: { status: 1 },
      order: { id: 'ASC' },
    })
  }

  async getTenantDetail(id: number) {
    return this.tenantRepository.findOneBy({ id })
  }

  async createTenant(dto: TenantDto) {
    const exists = await this.tenantRepository.findOneBy({ code: dto.code })
    if (exists)
      throw new BadRequestException('租户编码已存在')
    return this.tenantRepository.save(this.tenantRepository.create({
      ...dto,
      status: dto.status ?? 1,
    }))
  }

  async updateTenant(id: number, dto: Partial<TenantDto>) {
    const current = await this.tenantRepository.findOneBy({ id })
    if (!current)
      throw new BadRequestException('租户不存在')
    if (dto.code && dto.code !== current.code) {
      const exists = await this.tenantRepository.findOneBy({ code: dto.code })
      if (exists)
        throw new BadRequestException('租户编码已存在')
    }
    await this.tenantRepository.update(id, dto)
    return this.getTenantDetail(id)
  }

  async listAreas(dto: TenantAreaQueryDto) {
    const { tenantId, keyword, status } = dto
    const qb = this.areaRepository
      .createQueryBuilder('area')
      .leftJoinAndMapOne('area.tenant', TenantEntity, 'tenant', 'tenant.id = area.tenantId')

    if (tenantId)
      qb.andWhere('area.tenantId = :tenantId', { tenantId })
    if (keyword) {
      qb.andWhere(new Brackets(builder => builder
        .where('area.code LIKE :keyword', { keyword: `%${keyword}%` })
        .orWhere('area.name LIKE :keyword', { keyword: `%${keyword}%` })
        .orWhere('area.shortName LIKE :keyword', { keyword: `%${keyword}%` })
        .orWhere('area.contactPhone LIKE :keyword', { keyword: `%${keyword}%` }),
      ))
    }
    if (status !== undefined)
      qb.andWhere('area.status = :status', { status })

    qb.orderBy('area.tenantId', 'ASC').addOrderBy('area.sortNo', 'ASC').addOrderBy('area.id', 'ASC')
    return paginate(qb, { page: dto.page, pageSize: dto.pageSize })
  }

  async areaOptions(tenantId?: number) {
    const qb = this.areaRepository
      .createQueryBuilder('area')
      .leftJoinAndMapOne('area.tenant', TenantEntity, 'tenant', 'tenant.id = area.tenantId')
      .where('area.status = 1')

    if (tenantId)
      qb.andWhere('area.tenantId = :tenantId', { tenantId })

    return qb.orderBy('area.tenantId', 'ASC').addOrderBy('area.sortNo', 'ASC').getMany()
  }

  async getAreaDetail(id: number) {
    return this.areaRepository.findOneBy({ id })
  }

  async createArea(dto: TenantAreaDto) {
    await this.ensureTenantExists(dto.tenantId)
    const exists = await this.areaRepository.findOneBy({ tenantId: dto.tenantId, code: dto.code })
    if (exists)
      throw new BadRequestException('院区编码已存在')
    const area = await this.areaRepository.save(this.areaRepository.create({
      ...dto,
      status: dto.status ?? 1,
      defaultArea: dto.defaultArea ?? 0,
      sortNo: dto.sortNo ?? 0,
    }))
    if (Number(area.defaultArea) === 1)
      await this.ensureSingleDefaultArea(area.tenantId, area.id)
    return area
  }

  async updateArea(id: number, dto: Partial<TenantAreaDto>) {
    const current = await this.areaRepository.findOneBy({ id })
    if (!current)
      throw new BadRequestException('院区不存在')
    const tenantId = dto.tenantId ?? current.tenantId
    await this.ensureTenantExists(tenantId)
    if (dto.code && (dto.code !== current.code || tenantId !== current.tenantId)) {
      const exists = await this.areaRepository.findOneBy({ tenantId, code: dto.code })
      if (exists && exists.id !== id)
        throw new BadRequestException('院区编码已存在')
    }
    await this.areaRepository.update(id, { ...dto, tenantId })
    if (Number(dto.defaultArea) === 1)
      await this.ensureSingleDefaultArea(tenantId, id)
    return this.getAreaDetail(id)
  }

  async getUserAreaGrants(userId: number) {
    return this.userAreaRepository
      .createQueryBuilder('ua')
      .innerJoin(TenantEntity, 'tenant', 'tenant.id = ua.tenant_id')
      .innerJoin(TenantAreaEntity, 'area', 'area.id = ua.area_id AND area.tenant_id = ua.tenant_id')
      .select([
        'ua.id AS id',
        'ua.user_id AS userId',
        'ua.tenant_id AS tenantId',
        'tenant.name AS tenantName',
        'ua.area_id AS areaId',
        'area.name AS areaName',
        'ua.default_area AS defaultArea',
      ])
      .where('ua.user_id = :userId', { userId })
      .orderBy('ua.default_area', 'DESC')
      .addOrderBy('tenant.id', 'ASC')
      .addOrderBy('area.sort_no', 'ASC')
      .getRawMany()
      .then(rows => rows.map(row => ({
        id: Number(row.id),
        userId: Number(row.userId),
        tenantId: Number(row.tenantId),
        tenantName: row.tenantName,
        areaId: Number(row.areaId),
        areaName: row.areaName,
        defaultArea: Number(row.defaultArea),
      })))
  }

  async saveUserAreaGrants(userId: number, dto: UserAreaGrantDto) {
    const items = dto.items || []
    if (!items.length)
      throw new BadRequestException('至少需要授权一个院区')

    const defaultCount = items.filter(item => Number(item.defaultArea) === 1).length
    const normalized = items.map((item, index) => ({
      ...item,
      defaultArea: defaultCount > 0 ? Number(item.defaultArea ?? 0) : (index === 0 ? 1 : 0),
    }))

    for (const item of normalized) {
      const area = await this.areaRepository.findOneBy({ id: item.areaId, tenantId: item.tenantId, status: 1 })
      if (!area)
        throw new BadRequestException('授权院区不存在或已停用')
    }

    await this.userAreaRepository.manager.transaction(async (manager) => {
      await manager.delete(UserAreaEntity, { userId })
      await manager.save(UserAreaEntity, normalized.map(item => manager.create(UserAreaEntity, {
        userId,
        tenantId: item.tenantId,
        areaId: item.areaId,
        defaultArea: item.defaultArea,
      })))
    })

    return this.getUserAreaGrants(userId)
  }

  async getUserAreaOptions(userId: number, platformAdmin = false): Promise<TenantAreaOption[]> {
    if (platformAdmin)
      return this.getAllActiveAreaOptions()

    const rows = await this.userAreaRepository
      .createQueryBuilder('ua')
      .innerJoin(TenantEntity, 'tenant', 'tenant.id = ua.tenant_id AND tenant.status = 1')
      .innerJoin(TenantAreaEntity, 'area', 'area.id = ua.area_id AND area.tenant_id = ua.tenant_id AND area.status = 1')
      .select([
        'ua.tenant_id AS tenant_id',
        'tenant.name AS tenant_name',
        'ua.area_id AS area_id',
        'area.name AS area_name',
        'ua.default_area AS default_area',
      ])
      .where('ua.user_id = :userId', { userId })
      .orderBy('ua.default_area', 'DESC')
      .addOrderBy('area.sort_no', 'ASC')
      .getRawMany()

    if (rows.length) {
      return rows.map(row => ({
        tenantId: Number(row.tenant_id),
        tenantName: row.tenant_name,
        areaId: Number(row.area_id),
        areaName: row.area_name,
        defaultArea: Boolean(Number(row.default_area)),
      }))
    }

    if (this.appConfig.strictTenantContext)
      return []

    const [tenant, area] = await Promise.all([
      this.getTenant(DEFAULT_TENANT_ID),
      this.getArea(DEFAULT_AREA_ID),
    ])

    if (!tenant || !area)
      return []

    return [{
      tenantId: tenant.id,
      tenantName: tenant.name,
      areaId: area.id,
      areaName: area.name,
      defaultArea: true,
    }]
  }

  async resolveDefaultContext(userId: number, platformAdmin = false) {
    const options = await this.getUserAreaOptions(userId, platformAdmin)
    const selected = options.find(item => item.defaultArea) ?? options[0]

    if (!selected)
      throw new BadRequestException('当前账号没有可访问的院区')

    return {
      tenantId: selected.tenantId,
      tenantName: selected.tenantName,
      areaId: selected.areaId,
      areaName: selected.areaName,
      accessibleAreaIds: options
        .filter(item => item.tenantId === selected.tenantId)
        .map(item => item.areaId),
      areaOptions: options,
    }
  }

  async assertUserArea(userId: number, tenantId: number, areaId: number, platformAdmin = false) {
    const options = await this.getUserAreaOptions(userId, platformAdmin)
    const found = options.some(item => item.tenantId === tenantId && item.areaId === areaId)

    if (!found)
      throw new BadRequestException('无权访问目标院区')

    return options
  }

  private async ensureTenantExists(tenantId: number) {
    const tenant = await this.tenantRepository.findOneBy({ id: tenantId })
    if (!tenant)
      throw new BadRequestException('租户不存在')
  }

  private async ensureSingleDefaultArea(tenantId: number, areaId: number) {
    await this.areaRepository
      .createQueryBuilder()
      .update(TenantAreaEntity)
      .set({ defaultArea: 0 })
      .where('tenant_id = :tenantId', { tenantId })
      .andWhere('id <> :areaId', { areaId })
      .execute()
  }

  async resolveRequestContext(user: IAuthUser, requestedAreaId?: number | string | string[]) {
    const defaultContext = await this.resolveDefaultContext(user.uid, user.platformAdmin)
    const tenantId = user.tenantId ?? defaultContext.tenantId
    const parsedAreaId = Number(Array.isArray(requestedAreaId) ? requestedAreaId[0] : requestedAreaId)
    const areaId = Number.isFinite(parsedAreaId) && parsedAreaId > 0
      ? parsedAreaId
      : (user.areaId ?? defaultContext.areaId)
    const options = await this.assertUserArea(user.uid, tenantId, areaId, user.platformAdmin)
    const selected = options.find(item => item.tenantId === tenantId && item.areaId === areaId)

    return {
      accountId: user.accountId ?? user.uid,
      uid: user.uid,
      roles: user.roles ?? [],
      platformAdmin: user.platformAdmin,
      tenantId,
      tenantName: selected?.tenantName ?? user.tenantName ?? defaultContext.tenantName,
      areaId,
      areaName: selected?.areaName ?? user.areaName ?? defaultContext.areaName,
      accessibleAreaIds: options
        .filter(item => item.tenantId === tenantId)
        .map(item => item.areaId),
      areaOptions: options,
    }
  }

  private async getAllActiveAreaOptions(): Promise<TenantAreaOption[]> {
    const rows = await this.areaRepository
      .createQueryBuilder('area')
      .innerJoin(TenantEntity, 'tenant', 'tenant.id = area.tenant_id AND tenant.status = 1')
      .select([
        'area.tenant_id AS tenant_id',
        'tenant.name AS tenant_name',
        'area.id AS area_id',
        'area.name AS area_name',
        'area.default_area AS default_area',
      ])
      .where('area.status = 1')
      .orderBy('area.tenant_id', 'ASC')
      .addOrderBy('area.default_area', 'DESC')
      .addOrderBy('area.sort_no', 'ASC')
      .addOrderBy('area.id', 'ASC')
      .getRawMany()

    return rows.map(row => ({
      tenantId: Number(row.tenant_id),
      tenantName: row.tenant_name,
      areaId: Number(row.area_id),
      areaName: row.area_name,
      defaultArea: Boolean(Number(row.default_area)),
    }))
  }
}
