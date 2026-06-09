import { Body, Controller, Delete, Get, Post, Put, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { ApiResult } from '~/common/decorators/api-result.decorator'
import { IdParam } from '~/common/decorators/id-param.decorator'
import { CustomerService } from './customer.service'
import { CreateCustomerDto, QueryCustomerDto, UpdateCustomerDto } from './dto/customer.dto'
import { CustomerEntity } from './entities/customer.entity'

@ApiTags('VPet - 客户管理')
@Controller('vpet/customer')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  @ApiOperation({ summary: '客户列表' })
  @ApiResult({ type: [CustomerEntity], isPage: true })
  async list(@Query() dto: QueryCustomerDto) {
    return this.customerService.list(dto)
  }

  @Get(':id')
  @ApiOperation({ summary: '客户详情' })
  @ApiResult({ type: CustomerEntity })
  async get(@IdParam() id: number) {
    return this.customerService.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: '创建客户' })
  @ApiResult({ type: CustomerEntity })
  async create(@Body() dto: CreateCustomerDto) {
    return this.customerService.create(dto)
  }

  @Put(':id')
  @ApiOperation({ summary: '更新客户' })
  async update(@IdParam() id: number, @Body() dto: UpdateCustomerDto) {
    await this.customerService.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除客户' })
  async delete(@IdParam() id: number) {
    await this.customerService.delete(id)
  }
}
