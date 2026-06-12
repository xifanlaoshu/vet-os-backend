import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { IdParam } from '~/common/decorators/id-param.decorator'
import { AuthUser } from '~/modules/auth/decorators/auth-user.decorator'
import { ApproveTransferDto, CreateStoreDto, CreateTransferDto, QueryStoreDto, SetStoreStockDto } from './dto/store.dto'
import { StoreService } from './store.service'

@ApiTags('VPet - Store')
@Controller('vpet/store')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Get()
  @ApiOperation({ summary: 'Store list' })
  async stores(@Query() dto: QueryStoreDto, @AuthUser() user: IAuthUser) {
    return this.storeService.listStores(dto, user)
  }

  @Post()
  @ApiOperation({ summary: 'Create store' })
  async createStore(@Body() dto: CreateStoreDto, @AuthUser() user: IAuthUser) {
    return this.storeService.createStore(dto, user)
  }

  @Get(':id/stock')
  @ApiOperation({ summary: 'Store stock list' })
  async stock(@Param('id') id: number, @AuthUser() user: IAuthUser) {
    return this.storeService.listStock(Number(id), user)
  }

  @Post(':id/stock')
  @ApiOperation({ summary: 'Set store stock' })
  async setStock(@Param('id') id: number, @Body() dto: SetStoreStockDto, @AuthUser() user: IAuthUser) {
    return this.storeService.setStock(Number(id), dto, user)
  }

  @Get('transfer/list')
  @ApiOperation({ summary: 'Transfer list' })
  async transfers(@Query() dto: QueryStoreDto, @AuthUser() user: IAuthUser) {
    return this.storeService.listTransfers(dto, user)
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Create transfer' })
  async createTransfer(@Body() dto: CreateTransferDto, @AuthUser() user: IAuthUser) {
    return this.storeService.createTransfer(dto, user)
  }

  @Post('transfer/:id/approve')
  @ApiOperation({ summary: 'Approve transfer' })
  async approveTransfer(@IdParam() id: number, @Body() dto: ApproveTransferDto, @AuthUser() user: IAuthUser) {
    return this.storeService.approveTransfer(id, dto, user)
  }

  @Post('transfer/:id/complete')
  @ApiOperation({ summary: 'Complete transfer' })
  async completeTransfer(@IdParam() id: number, @AuthUser() user: IAuthUser) {
    return this.storeService.completeTransfer(id, user)
  }
}
