import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CustomerEntity } from '../vpet-customer/entities/customer.entity'
import { MemberCardLogEntity } from './entities/member-card-log.entity'
import { MemberCardEntity } from './entities/member-card.entity'
import { MemberController } from './member.controller'
import { MemberService } from './member.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([MemberCardEntity, MemberCardLogEntity, CustomerEntity]),
  ],
  controllers: [MemberController],
  providers: [MemberService],
  exports: [MemberService, TypeOrmModule],
})
export class VpetMemberModule {}
