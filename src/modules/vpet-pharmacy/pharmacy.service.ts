import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, LessThan, Repository } from 'typeorm'
import { BusinessException } from '~/common/exceptions/biz.exception'
import { requireTenantAreaContext, requireTenantContext } from '~/common/utils/tenant-context.util'
import { paginate } from '~/helper/paginate'
import { ConsentTemplateChargeItemEntity } from '../vpet-consent/entities/consent-template-charge-item.entity'
import { ConsentTemplateEntity } from '../vpet-consent/entities/consent-template.entity'
import { CreateChargeItemDto, CreateDrugDto, QueryChargeItemDto, QueryDrugDto, QueryStockTxnDto, StockInDto, UpdateChargeItemDto, UpdateDrugDto } from './dto/pharmacy.dto'
import { ChargeItemEntity } from './entities/charge-item.entity'
import { DrugBatchEntity } from './entities/drug-batch.entity'
import { DrugStockTxnEntity } from './entities/drug-stock-txn.entity'
import { DrugEntity } from './entities/drug.entity'

@Injectable()
export class PharmacyService {
  constructor(
    @InjectRepository(DrugEntity)
    private drugRepository: Repository<DrugEntity>,
    @InjectRepository(DrugBatchEntity)
    private batchRepository: Repository<DrugBatchEntity>,
    @InjectRepository(DrugStockTxnEntity)
    private txnRepository: Repository<DrugStockTxnEntity>,
    @InjectRepository(ChargeItemEntity)
    private chargeItemRepository: Repository<ChargeItemEntity>,
    @InjectRepository(ConsentTemplateEntity)
    private consentTemplateRepository: Repository<ConsentTemplateEntity>,
    @InjectRepository(ConsentTemplateChargeItemEntity)
    private consentTemplateChargeItemRepository: Repository<ConsentTemplateChargeItemEntity>,
    private dataSource: DataSource,
  ) {}

  async list(dto: QueryDrugDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { page = 1, pageSize = 10, keyword, category, drugType } = dto
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const qb = this.drugRepository.createQueryBuilder('d')
      .loadRelationCountAndMap('d.batchCount', 'd.batches')
      .andWhere('d.tenantId = :tenantId', { tenantId })

    if (keyword) {
      qb.andWhere('(d.drugName LIKE :kw OR d.tradeName LIKE :kw OR d.drugCode LIKE :kw)', {
        kw: `%${keyword}%`,
      })
    }
    else {
      if (category !== undefined)
        qb.andWhere('d.category = :category', { category })
      if (drugType !== undefined)
        qb.andWhere('d.drugType = :drugType', { drugType })
    }

    qb.orderBy('d.updatedAt', 'DESC')
    const result = await paginate(qb, { page, pageSize })

    const items = await Promise.all(result.items.map(async (drug) => {
      const stock = await this.getTotalStock(drug.id, { tenantId, areaId })
      const batchCount = (drug as any).batchCount ?? 0
      return { ...drug, ...this.buildDrugStockSnapshot(drug, stock), batchCount }
    }))

    return { items, meta: result.meta }
  }

  async getTotalStock(drugId: number, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>): Promise<number> {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const result = await this.batchRepository
      .createQueryBuilder('b')
      .select('COALESCE(SUM(b.quantity), 0)', 'total')
      .where('b.drugId = :drugId AND b.status = 1', { drugId })
      .andWhere('b.tenantId = :tenantId', { tenantId })
      .andWhere('b.areaId = :areaId', { areaId })
      .getRawOne()
    return Number(result?.total ?? 0)
  }

  async findOne(id: number, context?: Pick<IAuthUser, 'tenantId'>) {
    const { tenantId } = requireTenantContext(context)
    const drug = await this.drugRepository.findOne({
      where: { id, tenantId },
      relations: ['batches'],
    })
    if (!drug)
      throw new BusinessException('Drug not found')
    return drug
  }

  async create(dto: CreateDrugDto, context?: Pick<IAuthUser, 'tenantId'>) {
    const { tenantId } = requireTenantContext(context)
    return this.drugRepository.save({ ...this.normalizeDrugPayload(dto), tenantId })
  }

  async update(id: number, dto: UpdateDrugDto, context?: Pick<IAuthUser, 'tenantId'>) {
    const { tenantId } = requireTenantContext(context)
    const current = await this.drugRepository.findOneBy({ id, tenantId })
    if (!current)
      throw new BusinessException('Drug not found')
    await this.drugRepository.update({ id, tenantId }, this.normalizeDrugPayload(dto, current))
  }

  async listChargeItems(dto: QueryChargeItemDto, context?: Pick<IAuthUser, 'tenantId'>) {
    const { page = 1, pageSize = 10, keyword, category, status } = dto
    const { tenantId } = requireTenantContext(context)
    const qb = this.chargeItemRepository.createQueryBuilder('item')
      .andWhere('item.tenantId = :tenantId', { tenantId })

    if (keyword) {
      qb.andWhere('(item.itemCode LIKE :keyword OR item.itemName LIKE :keyword OR item.description LIKE :keyword)', {
        keyword: `%${keyword}%`,
      })
    }
    if (category)
      qb.andWhere('item.category = :category', { category })
    if (status !== undefined)
      qb.andWhere('item.status = :status', { status: Number(status) })

    qb.orderBy('item.updatedAt', 'DESC')
    const result = await paginate(qb, { page, pageSize })
    const items = await this.attachConsentTemplates(result.items, tenantId)
    return { ...result, items }
  }

  async createChargeItem(dto: CreateChargeItemDto, context?: Pick<IAuthUser, 'tenantId'>) {
    const { tenantId } = requireTenantContext(context)
    const item = await this.chargeItemRepository.save(this.chargeItemRepository.create({
      ...dto,
      tenantId,
      status: dto.status ?? 1,
      retailPrice: dto.retailPrice ?? 0,
    }))
    await this.saveChargeItemConsentTemplates(item.id, dto.consentTemplateIds, tenantId)
    return this.findChargeItem(item.id, context)
  }

  async updateChargeItem(id: number, dto: UpdateChargeItemDto, context?: Pick<IAuthUser, 'tenantId'>) {
    const { tenantId } = requireTenantContext(context)
    const item = await this.chargeItemRepository.findOneBy({ id, tenantId })
    if (!item)
      throw new BusinessException('Charge item not found')
    const { consentTemplateIds, ...payload } = dto
    await this.chargeItemRepository.update({ id, tenantId }, payload)
    if (consentTemplateIds !== undefined)
      await this.saveChargeItemConsentTemplates(id, consentTemplateIds, tenantId)
    return this.findChargeItem(id, context)
  }

  async deleteChargeItem(id: number, context?: Pick<IAuthUser, 'tenantId'>) {
    const { tenantId } = requireTenantContext(context)
    const item = await this.chargeItemRepository.findOneBy({ id, tenantId })
    if (!item)
      throw new BusinessException('Charge item not found')
    await this.chargeItemRepository.remove(item)
  }

  async delete(id: number, context?: Pick<IAuthUser, 'tenantId'>) {
    const { tenantId } = requireTenantContext(context)
    const drug = await this.drugRepository.findOneBy({ id, tenantId })
    if (!drug)
      throw new BusinessException('Drug not found')
    await this.batchRepository.delete({ drugId: id, tenantId })
    await this.drugRepository.remove(drug)
  }

  async stockIn(drugId: number, dto: StockInDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>): Promise<DrugBatchEntity> {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const drug = await this.drugRepository.findOneBy({ id: drugId, tenantId })
    if (!drug)
      throw new BusinessException('Drug not found')

    const packageContentQuantity = this.getPackageContentQuantity(drug)
    const stockQuantity = Number(dto.quantity || 0) * packageContentQuantity

    const batch = this.batchRepository.create({
      drugId,
      tenantId,
      areaId,
      batchNo: dto.batchNo,
      expireDate: dto.expireDate,
      purchasePrice: dto.purchasePrice ?? 0,
      quantity: stockQuantity,
      initialQuantity: stockQuantity,
      status: 1,
    })
    const saved = await this.batchRepository.save(batch)
    await this.createStockTxn(this.txnRepository, {
      drugId,
      batchId: saved.id,
      txnType: 1,
      refType: 'stock_in',
      refId: saved.id,
      tenantId,
      areaId,
      quantityBefore: 0,
      quantityChange: stockQuantity,
      quantityAfter: stockQuantity,
    })
    return saved
  }

  async stockOut(
    drugId: number,
    quantity: number,
    options?: {
      txnType?: number
      refType?: string | null
      refId?: number | null
      operatorId?: number | null
      tenantId?: number
      areaId?: number
    },
  ): Promise<void> {
    if (quantity <= 0) {
      throw new BusinessException('Stock out quantity must be greater than 0')
    }

    await this.dataSource.transaction(async (manager) => {
      const batchRepository = manager.getRepository(DrugBatchEntity)
      const txnRepository = manager.getRepository(DrugStockTxnEntity)
      const { tenantId, areaId } = requireTenantAreaContext(options)
      const batches = await batchRepository.createQueryBuilder('batch')
        .setLock('pessimistic_write')
        .where('batch.drugId = :drugId', { drugId })
        .andWhere('batch.tenantId = :tenantId', { tenantId })
        .andWhere('batch.areaId = :areaId', { areaId })
        .andWhere('batch.status = :status', { status: 1 })
        .orderBy('batch.expireDate', 'ASC')
        .addOrderBy('batch.id', 'ASC')
        .getMany()

      const totalAvailable = batches.reduce((sum, batch) => sum + Number(batch.quantity), 0)
      if (totalAvailable < quantity) {
        throw new BusinessException('Insufficient stock')
      }

      let remaining = quantity
      for (const batch of batches) {
        if (remaining <= 0)
          break
        const quantityBefore = Number(batch.quantity)
        const take = Math.min(quantityBefore, remaining)
        batch.quantity = Number(batch.quantity) - take
        remaining -= take
        if (Number(batch.quantity) <= 0)
          batch.status = 3
        await batchRepository.save(batch)
        await this.createStockTxn(txnRepository, {
          drugId,
          batchId: batch.id,
          txnType: options?.txnType ?? 2,
          refType: options?.refType ?? 'stock_out',
          refId: options?.refId ?? null,
          operatorId: options?.operatorId ?? null,
          tenantId,
          areaId,
          quantityBefore,
          quantityChange: -take,
          quantityAfter: Number(batch.quantity),
        })
      }
    })
  }

  async getBatches(drugId: number, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>): Promise<DrugBatchEntity[]> {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const drug = await this.drugRepository.findOneBy({ id: drugId, tenantId })
    const batches = await this.batchRepository.find({
      where: { drugId, tenantId, areaId },
      order: { expireDate: 'ASC' },
    })
    if (!drug)
      return batches
    const packageContentQuantity = this.getPackageContentQuantity(drug)
    return batches.map(batch => ({
      ...batch,
      dosageUnit: this.getDosageUnit(drug),
      packageUnit: drug.unit,
      packageContentQuantity,
      currentPackageQuantity: Number((Number(batch.quantity || 0) / packageContentQuantity).toFixed(2)),
      initialPackageQuantity: Number((Number(batch.initialQuantity || 0) / packageContentQuantity).toFixed(2)),
    })) as any
  }

  async getLowStock(context?: Pick<IAuthUser, 'tenantId' | 'areaId'>): Promise<any[]> {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const drugs = await this.drugRepository.find({ where: { status: 1, tenantId } })
    const result = []
    for (const drug of drugs) {
      const total = await this.getTotalStock(drug.id, { tenantId, areaId })
      const minStock = Number(drug.minStock || 0) * this.getPackageContentQuantity(drug)
      if (total < minStock) {
        result.push({ ...drug, ...this.buildDrugStockSnapshot(drug, total) })
      }
    }
    return result.sort((a, b) => a.currentStock - b.currentStock).slice(0, 20)
  }

  async getExpiringSoon(days = 30, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>): Promise<DrugBatchEntity[]> {
    const future = new Date()
    future.setDate(future.getDate() + days)
    const { tenantId, areaId } = requireTenantAreaContext(context)
    return this.batchRepository.find({
      where: {
        tenantId,
        areaId,
        status: 1,
        expireDate: LessThan(future.toISOString().split('T')[0]),
      },
      relations: ['drug'],
      order: { expireDate: 'ASC' },
    })
  }

  async updateBatch(id: number, dto: any, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>): Promise<void> {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const batch = await this.batchRepository.findOneBy({ id, tenantId, areaId })
    if (!batch)
      throw new BusinessException('Drug batch not found')
    await this.batchRepository.update({
      id,
      tenantId,
      areaId,
    }, {
      batchNo: dto.batchNo,
      expireDate: dto.expireDate,
      purchasePrice: dto.purchasePrice,
    })
  }

  async searchDrugs(keyword: string, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>): Promise<any[]> {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const qb = this.drugRepository.createQueryBuilder('d')
      .where('d.status = :status', { status: 1 })
      .andWhere('d.tenantId = :tenantId', { tenantId })

    if (keyword) {
      qb.andWhere('(d.drugName LIKE :keyword OR d.tradeName LIKE :keyword OR d.drugCode LIKE :keyword)', {
        keyword: `%${keyword}%`,
      })
    }

    qb.orderBy('d.updatedAt', 'DESC')
    const drugs = await qb.take(20).getMany()
    return Promise.all(drugs.map(async drug => ({
      id: drug.id,
      drugName: drug.drugName,
      specification: drug.specification,
      unit: this.getDosageUnit(drug),
      packageUnit: drug.unit,
      dosageUnit: this.getDosageUnit(drug),
      packageContentQuantity: this.getPackageContentQuantity(drug),
      retailPrice: this.getDosageUnitPrice(drug),
      packageRetailPrice: Number(drug.retailPrice || 0),
      dosageUnitPrice: this.getDosageUnitPrice(drug),
      currentStock: await this.getTotalStock(drug.id, { tenantId, areaId }),
    })))
  }

  async searchChargeableItems(keyword: string, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>): Promise<any[]> {
    const [drugs, chargeItems] = await Promise.all([
      this.searchDrugs(keyword, context),
      this.searchChargeItems(keyword, context),
    ])
    return [
      ...drugs.map(item => ({
        ...item,
        itemKind: 1,
        itemId: item.id,
        drugId: item.id,
        chargeItemId: null,
        itemName: item.drugName,
      })),
      ...chargeItems.map(item => ({
        ...item,
        itemKind: 2,
        itemId: item.id,
        drugId: null,
        chargeItemId: item.id,
        drugName: item.itemName,
        currentStock: null,
      })),
    ]
  }

  async findChargeItem(id: number, context?: Pick<IAuthUser, 'tenantId'>) {
    const { tenantId } = requireTenantContext(context)
    const item = await this.chargeItemRepository.findOneBy({ id, tenantId })
    if (!item)
      throw new BusinessException('Charge item not found')
    const [withTemplates] = await this.attachConsentTemplates([item], tenantId)
    return withTemplates
  }

  private async attachConsentTemplates(items: ChargeItemEntity[], tenantId: number) {
    if (!items.length)
      return []
    const itemIds = items.map(item => item.id)
    const links = await this.consentTemplateChargeItemRepository
      .createQueryBuilder('link')
      .leftJoinAndSelect('link.template', 'template', 'template.tenantId = :tenantId', { tenantId })
      .where('link.chargeItemId IN (:...itemIds)', { itemIds })
      .orderBy('template.category', 'ASC')
      .addOrderBy('template.name', 'ASC')
      .getMany()
    const map = new Map<number, ConsentTemplateEntity[]>()
    for (const link of links) {
      if (!map.has(link.chargeItemId))
        map.set(link.chargeItemId, [])
      if (link.template)
        map.get(link.chargeItemId)!.push(link.template)
    }
    return items.map(item => ({
      ...item,
      consentTemplates: map.get(item.id) || [],
      consentTemplateIds: (map.get(item.id) || []).map(template => template.id),
    }))
  }

  private async saveChargeItemConsentTemplates(chargeItemId: number, templateIds: number[] | undefined, tenantId: number) {
    if (templateIds === undefined)
      return
    const uniqueTemplateIds = [...new Set((templateIds || []).map(Number).filter(Boolean))]
    if (uniqueTemplateIds.length) {
      const count = await this.consentTemplateRepository
        .createQueryBuilder('template')
        .where('template.id IN (:...ids)', { ids: uniqueTemplateIds })
        .andWhere('template.tenantId = :tenantId', { tenantId })
        .andWhere('template.isActive = :isActive', { isActive: 1 })
        .getCount()
      if (count !== uniqueTemplateIds.length)
        throw new BusinessException('Consent template not found or inactive')
    }
    await this.consentTemplateChargeItemRepository.delete({ chargeItemId })
    if (!uniqueTemplateIds.length)
      return
    await this.consentTemplateChargeItemRepository.save(uniqueTemplateIds.map(templateId => this.consentTemplateChargeItemRepository.create({
      chargeItemId,
      templateId,
    })))
  }

  private async searchChargeItems(keyword: string, context?: Pick<IAuthUser, 'tenantId'>): Promise<any[]> {
    const { tenantId } = requireTenantContext(context)
    const qb = this.chargeItemRepository.createQueryBuilder('item')
      .where('item.status = :status', { status: 1 })
      .andWhere('item.tenantId = :tenantId', { tenantId })

    if (keyword) {
      qb.andWhere('(item.itemName LIKE :keyword OR item.itemCode LIKE :keyword OR item.category LIKE :keyword)', {
        keyword: `%${keyword}%`,
      })
    }

    const items = await qb.orderBy('item.updatedAt', 'DESC').take(20).getMany()
    return items.map(item => ({
      id: item.id,
      itemCode: item.itemCode,
      itemName: item.itemName,
      category: item.category,
      specification: item.specification,
      unit: item.unit,
      retailPrice: Number(item.retailPrice || 0),
    }))
  }

  getPackageContentQuantity(drug: DrugEntity | any): number {
    const quantity = Number(drug?.packageContentQuantity || 1)
    return quantity > 0 ? quantity : 1
  }

  getDosageUnit(drug: DrugEntity | any): string {
    return drug?.dosageUnit || drug?.unit || ''
  }

  getDosageUnitPrice(drug: DrugEntity | any): number {
    const explicitPrice = drug?.dosageUnitPrice
    if (explicitPrice !== undefined && explicitPrice !== null) {
      return Number(explicitPrice || 0)
    }
    const packageContentQuantity = this.getPackageContentQuantity(drug)
    return Number((Number(drug?.retailPrice || 0) / packageContentQuantity).toFixed(2))
  }

  private normalizeDrugPayload(dto: Partial<CreateDrugDto>, current?: DrugEntity) {
    const packageContentQuantity = Number(dto.packageContentQuantity ?? current?.packageContentQuantity ?? 1)
    const normalizedPackageContentQuantity = packageContentQuantity > 0 ? packageContentQuantity : 1
    const retailPrice = dto.retailPrice === undefined
      ? (current ? Number(current.retailPrice || 0) : undefined)
      : Number(dto.retailPrice || 0)
    const shouldRecalculateDosageUnitPrice = dto.dosageUnitPrice === undefined
      && (dto.retailPrice !== undefined || dto.packageContentQuantity !== undefined || !current)
    const payload = {
      drugCode: dto.drugCode,
      drugName: dto.drugName,
      tradeName: dto.tradeName,
      category: dto.category,
      drugType: dto.drugType,
      specification: dto.specification,
      unit: dto.unit,
      dosageUnit: dto.dosageUnit ?? dto.unit ?? current?.dosageUnit ?? current?.unit,
      packageContentQuantity: normalizedPackageContentQuantity,
      retailPrice,
      dosageUnitPrice: dto.dosageUnitPrice ?? (shouldRecalculateDosageUnitPrice && retailPrice !== undefined
        ? Number((retailPrice / normalizedPackageContentQuantity).toFixed(2))
        : current?.dosageUnitPrice),
      minStock: dto.minStock,
      supplier: dto.supplier,
    }
    return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined))
  }

  private buildDrugStockSnapshot(drug: DrugEntity | any, stock: number) {
    const packageContentQuantity = this.getPackageContentQuantity(drug)
    const packageStock = stock / packageContentQuantity
    return {
      currentStock: stock,
      currentPackageStock: Number(packageStock.toFixed(2)),
      dosageUnit: this.getDosageUnit(drug),
      packageUnit: drug.unit,
      packageContentQuantity,
      dosageUnitPrice: this.getDosageUnitPrice(drug),
      packageRetailPrice: Number(drug.retailPrice || 0),
    }
  }

  async listStockTxns(dto: QueryStockTxnDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { page = 1, pageSize = 20, drugId, refType, refId } = dto
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const qb = this.txnRepository.createQueryBuilder('txn')
      .leftJoinAndSelect('txn.drug', 'drug')
      .leftJoinAndSelect('txn.batch', 'batch')
      .leftJoinAndSelect('txn.operator', 'operator')
      .andWhere('txn.tenantId = :tenantId', { tenantId })
      .andWhere('txn.areaId = :areaId', { areaId })

    if (drugId)
      qb.andWhere('txn.drugId = :drugId', { drugId })
    if (refType)
      qb.andWhere('txn.refType = :refType', { refType })
    if (refId)
      qb.andWhere('txn.refId = :refId', { refId })

    qb.orderBy('txn.txnTime', 'DESC')
    return paginate(qb, { page, pageSize })
  }

  private async createStockTxn(
    txnRepository: Repository<DrugStockTxnEntity>,
    payload: {
      drugId: number
      batchId?: number | null
      txnType: number
      refType?: string | null
      refId?: number | null
      operatorId?: number | null
      tenantId?: number
      areaId?: number
      quantityBefore: number
      quantityChange: number
      quantityAfter: number
    },
  ) {
    await txnRepository.save(txnRepository.create({
      ...payload,
      txnTime: new Date().toISOString(),
    }))
  }
}
