import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { ApiResult } from '~/common/decorators/api-result.decorator'
import { IdParam } from '~/common/decorators/id-param.decorator'
import { CreateChargeItemDto, CreateDrugDto, QueryChargeItemDto, QueryDrugDto, QueryStockTxnDto, StockInDto, UpdateChargeItemDto, UpdateDrugDto } from './dto/pharmacy.dto'
import { DrugEntity } from './entities/drug.entity'
import { PharmacyService } from './pharmacy.service'

@ApiTags('VPet - Pharmacy')
@Controller('vpet/pharmacy')
export class PharmacyController {
  constructor(private readonly pharmacyService: PharmacyService) {}

  @Get()
  @ApiOperation({ summary: 'Drug list' })
  @ApiResult({ type: [DrugEntity], isPage: true })
  async list(@Query() dto: QueryDrugDto) {
    return this.pharmacyService.list(dto)
  }

  @Get('search')
  @ApiOperation({ summary: 'Search drugs for prescription' })
  async search(@Query('keyword') keyword: string) {
    return this.pharmacyService.searchDrugs(keyword)
  }

  @Get('chargeable-search')
  @ApiOperation({ summary: 'Search drugs and chargeable service items for prescription' })
  async chargeableSearch(@Query('keyword') keyword: string) {
    return this.pharmacyService.searchChargeableItems(keyword)
  }

  @Get('charge-items')
  @ApiOperation({ summary: 'Charge item list' })
  async chargeItems(@Query() dto: QueryChargeItemDto) {
    return this.pharmacyService.listChargeItems(dto)
  }

  @Post('charge-items')
  @ApiOperation({ summary: 'Create charge item master data' })
  async createChargeItem(@Body() dto: CreateChargeItemDto) {
    return this.pharmacyService.createChargeItem(dto)
  }

  @Put('charge-items/:id')
  @ApiOperation({ summary: 'Update charge item' })
  async updateChargeItem(@Param('id') id: number, @Body() dto: UpdateChargeItemDto) {
    await this.pharmacyService.updateChargeItem(Number(id), dto)
  }

  @Delete('charge-items/:id')
  @ApiOperation({ summary: 'Delete charge item' })
  async deleteChargeItem(@Param('id') id: number) {
    await this.pharmacyService.deleteChargeItem(Number(id))
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Low stock drugs' })
  async lowStock() {
    return this.pharmacyService.getLowStock()
  }

  @Get('expiring')
  @ApiOperation({ summary: 'Expiring batches' })
  async expiring(@Query('days') days?: number) {
    return this.pharmacyService.getExpiringSoon(days)
  }

  @Get('stock-txns')
  @ApiOperation({ summary: 'Stock transactions' })
  async stockTxns(@Query() dto: QueryStockTxnDto) {
    return this.pharmacyService.listStockTxns(dto)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Drug detail with batches' })
  async get(@IdParam() id: number) {
    return this.pharmacyService.findOne(id)
  }

  @Get(':id/batches')
  @ApiOperation({ summary: 'Drug batches' })
  async getBatches(@IdParam() id: number) {
    return this.pharmacyService.getBatches(id)
  }

  @Post()
  @ApiOperation({ summary: 'Create drug master data' })
  @ApiResult({ type: DrugEntity })
  async create(@Body() dto: CreateDrugDto) {
    return this.pharmacyService.create(dto)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update drug' })
  async update(@IdParam() id: number, @Body() dto: UpdateDrugDto) {
    await this.pharmacyService.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete drug and batches' })
  async delete(@IdParam() id: number) {
    await this.pharmacyService.delete(id)
  }

  @Post(':id/stock-in')
  @ApiOperation({ summary: 'Stock in batch' })
  async stockIn(@IdParam() id: number, @Body() dto: StockInDto) {
    return this.pharmacyService.stockIn(id, dto)
  }

  @Post(':id/stock-out')
  @ApiOperation({ summary: 'Stock out with FIFO' })
  async stockOut(@IdParam() id: number, @Body('quantity') quantity: number) {
    await this.pharmacyService.stockOut(id, quantity)
  }

  @Put('batch/:id')
  @ApiOperation({ summary: 'Update batch info' })
  async updateBatch(@IdParam() id: number, @Body() dto: any) {
    await this.pharmacyService.updateBatch(id, dto)
  }
}
