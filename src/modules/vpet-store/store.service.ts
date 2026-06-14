import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { BusinessException } from '~/common/exceptions/biz.exception'
import { requireTenantAreaContext } from '~/common/utils/tenant-context.util'
import { paginate } from '~/helper/paginate'
import { DrugEntity } from '../vpet-pharmacy/entities/drug.entity'
import { ApproveTransferDto, CreateStoreDto, CreateTransferDto, QueryStoreDto, SetStoreStockDto } from './dto/store.dto'
import { DrugTransferItemEntity } from './entities/drug-transfer-item.entity'
import { DrugTransferEntity } from './entities/drug-transfer.entity'
import { StoreDrugStockEntity } from './entities/store-drug-stock.entity'
import { StoreEntity } from './entities/store.entity'

let transferSeq = 0

function generateTransferNo() {
  transferSeq += 1
  return `TRF${String(Date.now()).slice(-8)}${String(transferSeq).padStart(4, '0')}`
}

@Injectable()
export class StoreService {
  constructor(
    @InjectRepository(StoreEntity)
    private storeRepository: Repository<StoreEntity>,
    @InjectRepository(StoreDrugStockEntity)
    private stockRepository: Repository<StoreDrugStockEntity>,
    @InjectRepository(DrugTransferEntity)
    private transferRepository: Repository<DrugTransferEntity>,
    @InjectRepository(DrugTransferItemEntity)
    private transferItemRepository: Repository<DrugTransferItemEntity>,
    @InjectRepository(DrugEntity)
    private drugRepository: Repository<DrugEntity>,
    private dataSource: DataSource,
  ) {}

  async listStores(dto: QueryStoreDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { page = 1, pageSize = 10, keyword } = dto
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const qb = this.storeRepository.createQueryBuilder('store')
      .where('store.tenantId = :tenantId', { tenantId })
      .andWhere('store.areaId = :areaId', { areaId })
    if (keyword) {
      qb.andWhere('store.storeCode LIKE :keyword OR store.storeName LIKE :keyword', { keyword: `%${keyword}%` })
    }
    qb.orderBy('store.createdAt', 'DESC')
    return paginate(qb, { page, pageSize })
  }

  async createStore(dto: CreateStoreDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    return this.storeRepository.save(this.storeRepository.create({
      ...dto,
      tenantId,
      areaId,
      status: 1,
    }))
  }

  async listStock(storeId: number, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    return this.stockRepository.find({
      where: { storeId, tenantId, areaId },
      relations: ['drug'],
      order: { updatedAt: 'DESC' },
    })
  }

  async setStock(storeId: number, dto: SetStoreStockDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const [store, drug] = await Promise.all([
      this.storeRepository.findOneBy({ id: storeId, tenantId, areaId }),
      this.drugRepository.findOneBy({ id: dto.drugId, tenantId }),
    ])
    if (!store)
      throw new BusinessException('Store not found')
    if (!drug)
      throw new BusinessException('Drug not found')

    let stock = await this.stockRepository.findOneBy({ storeId, drugId: dto.drugId, tenantId, areaId })
    if (!stock) {
      stock = this.stockRepository.create({ tenantId, areaId, storeId, drugId: dto.drugId, quantity: dto.quantity, safetyStock: dto.safetyStock ?? 0 })
    }
    else {
      stock.quantity = dto.quantity
      stock.safetyStock = dto.safetyStock ?? stock.safetyStock
    }
    return this.stockRepository.save(stock)
  }

  async listTransfers(dto: QueryStoreDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { page = 1, pageSize = 10 } = dto
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const qb = this.transferRepository.createQueryBuilder('transfer')
      .leftJoinAndSelect('transfer.sourceStore', 'sourceStore')
      .leftJoinAndSelect('transfer.targetStore', 'targetStore')
      .leftJoinAndSelect('transfer.items', 'items')
      .where('transfer.tenantId = :tenantId', { tenantId })
      .andWhere('transfer.areaId = :areaId', { areaId })
    qb.orderBy('transfer.createdAt', 'DESC')
    return paginate(qb, { page, pageSize })
  }

  async getTransferDetail(id: number, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    return this.transferRepository.findOne({
      where: { id, tenantId, areaId },
      relations: ['sourceStore', 'targetStore', 'items'],
    })
  }

  async createTransfer(dto: CreateTransferDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    if (dto.sourceStoreId === dto.targetStoreId) {
      throw new BusinessException('Source and target store must be different')
    }

    const items = await Promise.all(dto.items.map(async (item) => {
      const [stock, drug] = await Promise.all([
        this.stockRepository.findOneBy({ storeId: dto.sourceStoreId, drugId: item.drugId, tenantId, areaId }),
        this.drugRepository.findOneBy({ id: item.drugId, tenantId }),
      ])
      if (!drug)
        throw new BusinessException(`Drug not found: ${item.drugId}`)
      if (!stock || Number(stock.quantity) < Number(item.quantity)) {
        throw new BusinessException(`Insufficient stock for drug ${drug.drugName}`)
      }
      return this.transferItemRepository.create({
        tenantId,
        areaId,
        drugId: drug.id,
        drugName: drug.drugName,
        specification: drug.specification,
        unit: drug.unit,
        quantity: item.quantity,
        snapshot: { drugCode: drug.drugCode, drugType: drug.drugType },
      })
    }))

    return this.transferRepository.save(this.transferRepository.create({
      tenantId,
      areaId,
      transferNo: generateTransferNo(),
      sourceStoreId: dto.sourceStoreId,
      targetStoreId: dto.targetStoreId,
      status: 1,
      reason: dto.reason,
      requestedBy: dto.requestedBy ?? null,
      requestedAt: new Date().toISOString(),
      items,
    }))
  }

  async approveTransfer(id: number, dto: ApproveTransferDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const transfer = await this.transferRepository.findOneBy({ id, tenantId, areaId })
    if (!transfer)
      throw new BusinessException('Transfer not found')
    if (Number(transfer.status) !== 1)
      throw new BusinessException('Only pending transfers can be approved')
    await this.transferRepository.update({ id, tenantId, areaId }, {
      status: 2,
      approvedBy: dto.approvedBy ?? null,
      approvedAt: transfer.approvedAt ?? new Date().toISOString(),
    })
    return this.transferRepository.findOne({
      where: { id, tenantId, areaId },
      relations: ['items', 'sourceStore', 'targetStore'],
    })
  }

  async completeTransfer(id: number, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    return this.dataSource.transaction(async (manager) => {
      const transferRepository = manager.getRepository(DrugTransferEntity)
      const transferItemRepository = manager.getRepository(DrugTransferItemEntity)
      const stockRepository = manager.getRepository(StoreDrugStockEntity)

      const transfer = await transferRepository.createQueryBuilder('transfer')
        .setLock('pessimistic_write')
        .leftJoinAndSelect('transfer.items', 'items')
        .where('transfer.id = :id', { id })
        .andWhere('transfer.tenantId = :tenantId', { tenantId })
        .andWhere('transfer.areaId = :areaId', { areaId })
        .getOne()
      if (!transfer)
        throw new BusinessException('Transfer not found')
      if (Number(transfer.status) === 3)
        return transfer
      if (Number(transfer.status) !== 2)
        throw new BusinessException('Transfer must be approved before completion')

      const items = await transferItemRepository.find({ where: { transferId: id, tenantId, areaId } })
      for (const item of items) {
        const sourceStock = await stockRepository.createQueryBuilder('stock')
          .setLock('pessimistic_write')
          .where('stock.storeId = :storeId', { storeId: transfer.sourceStoreId })
          .andWhere('stock.drugId = :drugId', { drugId: item.drugId })
          .andWhere('stock.tenantId = :tenantId', { tenantId })
          .andWhere('stock.areaId = :areaId', { areaId })
          .getOne()
        if (!sourceStock || Number(sourceStock.quantity) < Number(item.quantity)) {
          throw new BusinessException(`Insufficient source stock for ${item.drugName}`)
        }
        sourceStock.quantity = Number(sourceStock.quantity) - Number(item.quantity)
        await stockRepository.save(sourceStock)

        let targetStock = await stockRepository.createQueryBuilder('stock')
          .setLock('pessimistic_write')
          .where('stock.storeId = :storeId', { storeId: transfer.targetStoreId })
          .andWhere('stock.drugId = :drugId', { drugId: item.drugId })
          .andWhere('stock.tenantId = :tenantId', { tenantId })
          .andWhere('stock.areaId = :areaId', { areaId })
          .getOne()
        if (!targetStock) {
          targetStock = stockRepository.create({
            tenantId,
            areaId,
            storeId: transfer.targetStoreId,
            drugId: item.drugId,
            quantity: item.quantity,
            safetyStock: 0,
          })
        }
        else {
          targetStock.quantity = Number(targetStock.quantity) + Number(item.quantity)
        }
        await stockRepository.save(targetStock)
      }

      await transferRepository.update({ id, tenantId, areaId }, {
        status: 3,
        completedAt: new Date().toISOString(),
      })
      return transferRepository.findOne({
        where: { id, tenantId, areaId },
        relations: ['items', 'sourceStore', 'targetStore'],
      })
    })
  }
}
