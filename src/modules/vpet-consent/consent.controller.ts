import { Body, Controller, Delete, Get, Post, Put, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { IdParam } from '~/common/decorators/id-param.decorator'
import { AuthUser } from '~/modules/auth/decorators/auth-user.decorator'
import { Perm } from '~/modules/auth/decorators/permission.decorator'
import { ConsentService } from './consent.service'
import { CreateConsentRecordDto, CreateConsentTemplateDto, QueryConsentRecordDto, QueryConsentTemplateDto, SignConsentRecordDto, UpdateConsentTemplateDto } from './dto/consent.dto'

@ApiTags('VPet - Informed Consent')
@Perm('vpet:consent:list')
@Controller('vpet/consent')
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  @Get('templates')
  @ApiOperation({ summary: 'Consent template list' })
  async listTemplates(@Query() dto: QueryConsentTemplateDto, @AuthUser() user: IAuthUser) {
    return this.consentService.listTemplates(dto, user)
  }

  @Get('templates/active')
  @ApiOperation({ summary: 'Active consent templates' })
  async activeTemplates(@AuthUser() user: IAuthUser) {
    return this.consentService.activeTemplates(user)
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create consent template' })
  async createTemplate(@Body() dto: CreateConsentTemplateDto, @AuthUser() user: IAuthUser) {
    return this.consentService.createTemplate(dto, user)
  }

  @Put('templates/:id')
  @ApiOperation({ summary: 'Update consent template' })
  async updateTemplate(@IdParam() id: number, @Body() dto: UpdateConsentTemplateDto, @AuthUser() user: IAuthUser) {
    return this.consentService.updateTemplate(id, dto, user)
  }

  @Delete('templates/:id')
  @ApiOperation({ summary: 'Disable consent template' })
  async disableTemplate(@IdParam() id: number, @AuthUser() user: IAuthUser) {
    return this.consentService.disableTemplate(id, user)
  }

  @Get('records')
  @ApiOperation({ summary: 'Consent record list' })
  async listRecords(@Query() dto: QueryConsentRecordDto, @AuthUser() user: IAuthUser) {
    return this.consentService.listRecords(dto, user)
  }

  @Get('records/:id')
  @ApiOperation({ summary: 'Consent record detail' })
  async getRecord(@IdParam() id: number, @AuthUser() user: IAuthUser) {
    return this.consentService.getRecord(id, user)
  }

  @Post('records')
  @ApiOperation({ summary: 'Create consent record' })
  async createRecord(@Body() dto: CreateConsentRecordDto, @AuthUser() user: IAuthUser) {
    return this.consentService.createRecord(dto, user)
  }

  @Post('records/:id/sign')
  @ApiOperation({ summary: 'Sign consent record' })
  async signRecord(@IdParam() id: number, @Body() dto: SignConsentRecordDto, @AuthUser() user: IAuthUser) {
    return this.consentService.signRecord(id, dto, user)
  }

  @Post('records/:id/void')
  @ApiOperation({ summary: 'Void consent record' })
  async voidRecord(@IdParam() id: number, @AuthUser() user: IAuthUser) {
    return this.consentService.voidRecord(id, user)
  }
}
