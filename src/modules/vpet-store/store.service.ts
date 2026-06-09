import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { BusinessException } from '~/common/exceptions/biz.exception'
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

  async listStores(dto: QueryStoreDto) {
    const { page = 1, pageSize = 10, keyword } = dto
    const qb = this.storeRepository.createQueryBuilder('store')
    if (keyword) {
      qb.where('store.storeCode LIKE :keyword OR store.storeName LIKE :keyword', { keyword: `%${keyword}%` })
    }
    qb.orderBy('store.createdAt', 'DESC')
    return paginate(qb, { page, pageSize })
  }

  async createStore(dto: CreateStoreDto) {
    return this.storeRepository.save(this.storeRepository.create({ ...dto, status: 1 }))
  }

  async listStock(storeId: number) {
    return this.stockRepository.find({
      where: { storeId },
      relations: ['drug'],
      order: { updatedAt: 'DESC' },
    })
  }

  async setStock(storeId: number, dto: SetStoreStockDto) {
    const [store, drug] = await Promise.all([
      this.storeRepository.findOneBy({ id: storeId }),
      this.drugRepository.findOneBy({ id: dto.drugId }),
    ])
    if (!store)
      throw new BusinessException('Store not found')
    if (!drug)
      throw new BusinessException('Drug not found')

    let stock = await this.stockRepository.findOneBy({ storeId, drugId: dto.drugId })
    if (!stock) {
      stock = this.stockRepository.create({ storeId, drugId: dto.drugId, quantity: dto.quantity, safetyStock: dto.safetyStock ?? 0 })
    }
    else {
      stock.quantity = dto.quantity
      stock.safetyStock = dto.safetyStock ?? stock.safetyStock
    }
    return this.stockRepository.save(stock)
  }

  async listTransfers(dto: QueryStoreDto) {
    const { page = 1, pageSize = 10 } = dto
    const qb = this.transferRepository.createQueryBuilder('transfer')
      .leftJoinAndSelect('transfer.sourceStore', 'sourceStore')
      .leftJoinAndSelect('transfer.targetStore', 'targetStore')
      .leftJoinAndSelect('transfer.items', 'items')
    qb.orderBy('transfer.createdAt', 'DESC')
    return paginate(qb, { page, pageSize })
  }

  async createTransfer(dto: CreateTransferDto) {
    if (dto.sourceStoreId === dto.targetStoreId) {
      throw new BusinessException('Source and target store must be different')
    }

    const items = await Promise.all(dto.items.map(async (item) => {
      const [stock, drug] = await Promise.all([
        this.stockRepository.findOneBy({ storeId: dto.sourceStoreId, drugId: item.drugId }),
        this.drugRepository.findOneBy({ id: item.drugId }),
      ])
      if (!drug)
        throw new BusinessException(`Drug not found: ${item.drugId}`)
      if (!stock || Number(stock.quantity) < Number(item.quantity)) {
        throw new BusinessException(`Insufficient stock for drug ${drug.drugName}`)
      }
      return this.transferItemRepository.create({
        drugId: drug.id,
        drugName: drug.drugName,
        specification: drug.specification,
        unit: drug.unit,
        quantity: item.quantity,
        snapshot: { drugCode: drug.drugCode, drugType: drug.drugType },
      })
    }))

    return this.transferRepository.save(this.transferRepository.create({
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

  async approveTransfer(id: number, dto: ApproveTransferDto) {
    await this.transferRepository.update(id, {
      status: 2,
      approvedBy: dto.approvedBy ?? null,
      approvedAt: new Date().toISOString(),
    })
    return this.transferRepository.findOne({
      where: { id },
      relations: ['items', 'sourceStore', 'targetStore'],
    })
  }

  async completeTransfer(id: number) {
    return this.dataSource.transaction(async (manager) => {
      const transferRepository = manager.getRepository(DrugTransferEntity)
      const transferItemRepository = manager.getRepository(DrugTransferItemEntity)
      const stockRepository = manager.getRepository(StoreDrugStockEntity)

      const transfer = await transferRepository.findOne({
        where: { id },
        relations: ['items'],
      })
      if (!transfer)
        throw new BusinessException('Transfer not found')
      if (Number(transfer.status) === 3)
        return transfer
      if (Number(transfer.status) !== 2)
        throw new BusinessException('Transfer must be approved before completion')

      const items = await transferItemRepository.find({ where: { transferId: id } })
      for (const item of items) {
        const sourceStock = await stockRepository.findOneBy({ storeId: transfer.sourceStoreId, drugId: item.drugId })
        if (!sourceStock || Number(sourceStock.quantity) < Number(item.quantity)) {
          throw new BusinessException(`Insufficient source stock for ${item.drugName}`)
        }
        sourceStock.quantity = Number(sourceStock.quantity) - Number(item.quantity)
        await stockRepository.save(sourceStock)

        let targetStock = await stockRepository.findOneBy({ storeId: transfer.targetStoreId, drugId: item.drugId })
        if (!targetStock) {
          targetStock = stockRepository.create({
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

      await transferRepository.update(id, {
        status: 3,
        completedAt: new Date().toISOString(),
      })
      return transferRepository.findOne({
        where: { id },
        relations: ['items', 'sourceStore', 'targetStore'],
      })
    })
  }
}
