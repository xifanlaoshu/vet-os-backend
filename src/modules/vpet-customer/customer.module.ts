import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { LoggerModule } from '~/shared/logger/logger.module'
import { CustomerController } from './customer.controller'
import { CustomerService } from './customer.service'
import { CustomerEntity } from './entities/customer.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([CustomerEntity]),
    LoggerModule,
  ],
  controllers: [CustomerController],
  providers: [CustomerService],
  exports: [CustomerService, TypeOrmModule],
})
export class VpetCustomerModule {}
