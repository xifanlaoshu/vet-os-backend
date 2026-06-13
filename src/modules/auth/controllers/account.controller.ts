import { Body, Controller, Get, Post, Put, Req, UseGuards } from '@nestjs/common'
import { ApiExtraModels, ApiOperation, ApiTags } from '@nestjs/swagger'
import { FastifyRequest } from 'fastify'

import { ApiResult } from '~/common/decorators/api-result.decorator'

import { ApiSecurityAuth } from '~/common/decorators/swagger.decorator'
import { AllowAnon } from '~/modules/auth/decorators/allow-anon.decorator'
import { AuthUser } from '~/modules/auth/decorators/auth-user.decorator'

import { PasswordUpdateDto } from '~/modules/user/dto/password.dto'

import { AccountInfo } from '../../user/user.model'
import { UserService } from '../../user/user.service'
import { AuthService } from '../auth.service'
import { AccountMenus, AccountUpdateDto, SelectContextDto, SwitchAreaDto } from '../dto/account.dto'
import { JwtAuthGuard } from '../guards/jwt-auth.guard'

@ApiTags('Account - 账户模块')
@ApiSecurityAuth()
@ApiExtraModels(AccountInfo)
@UseGuards(JwtAuthGuard)
@Controller('account')
export class AccountController {
  constructor(
    private userService: UserService,
    private authService: AuthService,
  ) {}

  @Get('profile')
  @ApiOperation({ summary: '获取账户资料' })
  @ApiResult({ type: AccountInfo })
  @AllowAnon()
  async profile(@AuthUser() user: IAuthUser): Promise<AccountInfo> {
    return this.userService.getAccountInfo(user.uid)
  }

  @Get('logout')
  @ApiOperation({ summary: '账户登出' })
  @AllowAnon()
  async logout(@AuthUser() user: IAuthUser, @Req() req: FastifyRequest): Promise<void> {
    await this.authService.clearLoginStatus(user, req.accessToken)
  }

  @Get('menus')
  @ApiOperation({ summary: '获取菜单列表' })
  @ApiResult({ type: [AccountMenus] })
  @AllowAnon()
  async menu(@AuthUser() user: IAuthUser) {
    return this.authService.getMenus(user)
  }

  @Get('permissions')
  @ApiOperation({ summary: '获取权限列表' })
  @ApiResult({ type: [String] })
  @AllowAnon()
  async permissions(@AuthUser() user: IAuthUser): Promise<string[]> {
    return this.authService.getPermissions(user)
  }

  @Get('context')
  @ApiOperation({ summary: '获取当前租户与院区上下文' })
  @AllowAnon()
  async context(@AuthUser() user: IAuthUser) {
    return this.authService.getContext(user)
  }

  @Post('switch-area')
  @ApiOperation({ summary: '切换当前院区' })
  @AllowAnon()
  async switchArea(@AuthUser() user: IAuthUser, @Body() dto: SwitchAreaDto) {
    return this.authService.switchArea(user, dto.areaId)
  }

  @Post('select-context')
  @ApiOperation({ summary: '选择当前登录租户与院区' })
  @AllowAnon()
  async selectContext(@AuthUser() user: IAuthUser, @Body() dto: SelectContextDto) {
    return this.authService.selectContext(user, dto.tenantId, dto.areaId)
  }

  @Put('update')
  @ApiOperation({ summary: '更改账户资料' })
  @AllowAnon()
  async update(
    @AuthUser() user: IAuthUser, @Body()
dto: AccountUpdateDto,
  ): Promise<void> {
    await this.userService.updateAccountInfo(user.uid, dto)
  }

  @Post('password')
  @ApiOperation({ summary: '更改账户密码' })
  @AllowAnon()
  async password(
    @AuthUser() user: IAuthUser, @Body()
dto: PasswordUpdateDto,
  ): Promise<void> {
    await this.userService.updatePassword(user.uid, dto)
  }
}
