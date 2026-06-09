import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { IdParam } from '~/common/decorators/id-param.decorator'
import { ApproveTransferDto, CreateStoreDto, CreateTransferDto, QueryStoreDto, SetStoreStockDto } from './dto/store.dto'
import { StoreService } from './store.service'

@ApiTags('VPet - Store')
@Controller('vpet/store')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Get()
  @ApiOperation({ summary: 'Store list' })
  async stores(@Query() dto: QueryStoreDto) {
    return this.storeService.listStores(dto)
  }

  @Post()
  @ApiOperation({ summary: 'Create store' })
  async createStore(@Body() dto: CreateStoreDto) {
    return this.storeService.createStore(dto)
  }

  @Get(':id/stock')
  @ApiOperation({ summary: 'Store stock list' })
  async stock(@Param('id') id: number) {
    return this.storeService.listStock(Number(id))
  }

  @Post(':id/stock')
  @ApiOperation({ summary: 'Set store stock' })
  async setStock(@Param('id') id: number, @Body() dto: SetStoreStockDto) {
    return this.storeService.setStock(Number(id), dto)
  }

  @Get('transfer/list')
  @ApiOperation({ summary: 'Transfer list' })
  async transfers(@Query() dto: QueryStoreDto) {
    return this.storeService.listTransfers(dto)
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Create transfer' })
  async createTransfer(@Body() dto: CreateTransferDto) {
    return this.storeService.createTransfer(dto)
  }

  @Post('transfer/:id/approve')
  @ApiOperation({ summary: 'Approve transfer' })
  async approveTransfer(@IdParam() id: number, @Body() dto: ApproveTransferDto) {
    return this.storeService.approveTransfer(id, dto)
  }

  @Post('transfer/:id/complete')
  @ApiOperation({ summary: 'Complete transfer' })
  async completeTransfer(@IdParam() id: number) {
    return this.storeService.completeTransfer(id)
  }
}
