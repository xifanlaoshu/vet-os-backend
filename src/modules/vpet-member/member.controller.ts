import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { IdParam } from '~/common/decorators/id-param.decorator'
import { AuthUser } from '~/modules/auth/decorators/auth-user.decorator'
import { Perm } from '~/modules/auth/decorators/permission.decorator'
import {
  DeductDto,
  OpenCardDto,
  QueryMemberCardDto,
  QueryMemberCardLogDto,
  RechargeDto,
} from './dto/member.dto'
import { MemberService } from './member.service'

@ApiTags('VPet - 会员管理')
@Perm('vpet:member:list')
@Controller('vpet/member')
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @Get('card')
  @ApiOperation({ summary: '会员卡列表' })
  async listCards(@Query() dto: QueryMemberCardDto, @AuthUser() user: IAuthUser) {
    return this.memberService.listCards(dto, user)
  }

  @Post('card')
  @ApiOperation({ summary: '开卡' })
  async openCard(@Body() dto: OpenCardDto, @AuthUser() user: IAuthUser) {
    return this.memberService.openCard(dto, user)
  }

  @Get('card/customer/:customerId')
  @ApiOperation({ summary: '按客户查询会员卡' })
  async getCard(@Param('customerId') customerId: number, @AuthUser() user: IAuthUser) {
    return this.memberService.getCardByCustomer(customerId, user)
  }

  @Post('card/:id/recharge')
  @ApiOperation({ summary: '会员卡充值' })
  async recharge(@IdParam() id: number, @Body() dto: RechargeDto, @AuthUser() user: IAuthUser) {
    return this.memberService.recharge(id, dto, user)
  }

  @Post('card/:id/deduct')
  @ApiOperation({ summary: '会员卡扣款' })
  async deduct(@IdParam() id: number, @Body() dto: DeductDto, @AuthUser() user: IAuthUser) {
    return this.memberService.deduct(id, dto, user)
  }

  @Get('card/:id/logs')
  @ApiOperation({ summary: '会员卡流水' })
  async getCardLogs(@IdParam() id: number, @Query() dto: QueryMemberCardLogDto, @AuthUser() user: IAuthUser) {
    return this.memberService.getCardLogs(id, dto, user)
  }

  @Get('balance/:customerId')
  @ApiOperation({ summary: '查询会员余额' })
  async getBalance(@Param('customerId') customerId: number, @AuthUser() user: IAuthUser) {
    return this.memberService.getBalance(customerId, user)
  }
}
