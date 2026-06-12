import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { ApiResult } from '~/common/decorators/api-result.decorator'
import { IdParam } from '~/common/decorators/id-param.decorator'
import { AuthUser } from '~/modules/auth/decorators/auth-user.decorator'
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
  async list(@Query() dto: QueryDrugDto, @AuthUser() user: IAuthUser) {
    return this.pharmacyService.list(dto, user)
  }

  @Get('search')
  @ApiOperation({ summary: 'Search drugs for prescription' })
  async search(@Query('keyword') keyword: string, @AuthUser() user: IAuthUser) {
    return this.pharmacyService.searchDrugs(keyword, user)
  }

  @Get('chargeable-search')
  @ApiOperation({ summary: 'Search drugs and chargeable service items for prescription' })
  async chargeableSearch(@Query('keyword') keyword: string, @AuthUser() user: IAuthUser) {
    return this.pharmacyService.searchChargeableItems(keyword, user)
  }

  @Get('charge-items')
  @ApiOperation({ summary: 'Charge item list' })
  async chargeItems(@Query() dto: QueryChargeItemDto, @AuthUser() user: IAuthUser) {
    return this.pharmacyService.listChargeItems(dto, user)
  }

  @Post('charge-items')
  @ApiOperation({ summary: 'Create charge item master data' })
  async createChargeItem(@Body() dto: CreateChargeItemDto, @AuthUser() user: IAuthUser) {
    return this.pharmacyService.createChargeItem(dto, user)
  }

  @Put('charge-items/:id')
  @ApiOperation({ summary: 'Update charge item' })
  async updateChargeItem(@Param('id') id: number, @Body() dto: UpdateChargeItemDto, @AuthUser() user: IAuthUser) {
    await this.pharmacyService.updateChargeItem(Number(id), dto, user)
  }

  @Delete('charge-items/:id')
  @ApiOperation({ summary: 'Delete charge item' })
  async deleteChargeItem(@Param('id') id: number, @AuthUser() user: IAuthUser) {
    await this.pharmacyService.deleteChargeItem(Number(id), user)
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Low stock drugs' })
  async lowStock(@AuthUser() user: IAuthUser) {
    return this.pharmacyService.getLowStock(user)
  }

  @Get('expiring')
  @ApiOperation({ summary: 'Expiring batches' })
  async expiring(@Query('days') days?: number, @AuthUser() user?: IAuthUser) {
    return this.pharmacyService.getExpiringSoon(days, user)
  }

  @Get('stock-txns')
  @ApiOperation({ summary: 'Stock transactions' })
  async stockTxns(@Query() dto: QueryStockTxnDto, @AuthUser() user: IAuthUser) {
    return this.pharmacyService.listStockTxns(dto, user)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Drug detail with batches' })
  async get(@IdParam() id: number, @AuthUser() user: IAuthUser) {
    return this.pharmacyService.findOne(id, user)
  }

  @Get(':id/batches')
  @ApiOperation({ summary: 'Drug batches' })
  async getBatches(@IdParam() id: number, @AuthUser() user: IAuthUser) {
    return this.pharmacyService.getBatches(id, user)
  }

  @Post()
  @ApiOperation({ summary: 'Create drug master data' })
  @ApiResult({ type: DrugEntity })
  async create(@Body() dto: CreateDrugDto, @AuthUser() user: IAuthUser) {
    return this.pharmacyService.create(dto, user)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update drug' })
  async update(@IdParam() id: number, @Body() dto: UpdateDrugDto, @AuthUser() user: IAuthUser) {
    await this.pharmacyService.update(id, dto, user)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete drug and batches' })
  async delete(@IdParam() id: number, @AuthUser() user: IAuthUser) {
    await this.pharmacyService.delete(id, user)
  }

  @Post(':id/stock-in')
  @ApiOperation({ summary: 'Stock in batch' })
  async stockIn(@IdParam() id: number, @Body() dto: StockInDto, @AuthUser() user: IAuthUser) {
    return this.pharmacyService.stockIn(id, dto, user)
  }

  @Post(':id/stock-out')
  @ApiOperation({ summary: 'Stock out with FIFO' })
  async stockOut(@IdParam() id: number, @Body('quantity') quantity: number, @AuthUser() user: IAuthUser) {
    await this.pharmacyService.stockOut(id, quantity, user)
  }

  @Put('batch/:id')
  @ApiOperation({ summary: 'Update batch info' })
  async updateBatch(@IdParam() id: number, @Body() dto: any, @AuthUser() user: IAuthUser) {
    await this.pharmacyService.updateBatch(id, dto, user)
  }
}
