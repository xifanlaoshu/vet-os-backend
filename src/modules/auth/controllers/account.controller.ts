import { Body, Controller, Get, Inject, Post, Put, Req, Res, UseGuards } from '@nestjs/common'
import { ApiExtraModels, ApiOperation, ApiTags } from '@nestjs/swagger'
import { FastifyReply, FastifyRequest } from 'fastify'

import { ApiResult } from '~/common/decorators/api-result.decorator'

import { ApiSecurityAuth } from '~/common/decorators/swagger.decorator'
import { AppConfig, IAppConfig } from '~/config'
import { AllowAnon } from '~/modules/auth/decorators/allow-anon.decorator'
import { AuthUser } from '~/modules/auth/decorators/auth-user.decorator'
import { clearAuthSessionCookies } from '~/modules/auth/utils/session-cookie.util'

import { PasswordUpdateDto } from '~/modules/user/dto/password.dto'

import { AccountInfo } from '../../user/user.model'
import { UserService } from '../../user/user.service'
import { AuthService } from '../auth.service'
import { AccountMenus, AccountUpdateDto, MfaCodeDto, SelectContextDto, SwitchAreaDto } from '../dto/account.dto'
import { JwtAuthGuard } from '../guards/jwt-auth.guard'
import { MfaService } from '../services/mfa.service'

@ApiTags('Account - 账户模块')
@ApiSecurityAuth()
@ApiExtraModels(AccountInfo)
@UseGuards(JwtAuthGuard)
@Controller('account')
export class AccountController {
  constructor(
    private userService: UserService,
    private authService: AuthService,
    private mfaService: MfaService,
    @Inject(AppConfig.KEY) private readonly appConfig: IAppConfig,
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
  async logout(
    @AuthUser() user: IAuthUser,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<void> {
    await this.authService.clearLoginStatus(user, req.accessToken)
    clearAuthSessionCookies(reply, this.appConfig)
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

  @Post('mfa/setup')
  @ApiOperation({ summary: 'Create MFA setup secret' })
  @AllowAnon()
  async setupMfa(@AuthUser() user: IAuthUser) {
    return this.mfaService.createSetup(user)
  }

  @Post('mfa/enable')
  @ApiOperation({ summary: 'Enable MFA' })
  @AllowAnon()
  async enableMfa(@AuthUser() user: IAuthUser, @Body() dto: MfaCodeDto) {
    await this.mfaService.enable(user, dto.code)
  }

  @Post('mfa/disable')
  @ApiOperation({ summary: 'Disable MFA' })
  @AllowAnon()
  async disableMfa(@AuthUser() user: IAuthUser, @Body() dto: MfaCodeDto) {
    await this.mfaService.disable(user, dto.code)
  }
}
