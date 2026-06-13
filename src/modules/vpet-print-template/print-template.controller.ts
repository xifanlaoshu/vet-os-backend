import { Body, Controller, Delete, Get, Post, Put, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { IdParam } from '~/common/decorators/id-param.decorator'
import { AuthUser } from '~/modules/auth/decorators/auth-user.decorator'
import { Perm } from '~/modules/auth/decorators/permission.decorator'
import { CreatePrintTemplateDto, QueryPrintTemplateDto, UpdatePrintTemplateDto } from './dto/print-template.dto'
import { PrintTemplateService } from './print-template.service'

@ApiTags('VPet - Print Template')
@Perm('vpet:print-template:list')
@Controller('vpet/print-templates')
export class PrintTemplateController {
  constructor(private readonly templateService: PrintTemplateService) {}

  @Get()
  @ApiOperation({ summary: 'Print template list' })
  list(@Query() dto: QueryPrintTemplateDto, @AuthUser() user: IAuthUser) {
    return this.templateService.list(dto, user)
  }

  @Get('active')
  @ApiOperation({ summary: 'Active print templates by type' })
  active(@Query('templateType') templateType: string, @AuthUser() user: IAuthUser) {
    return this.templateService.active(templateType, user)
  }

  @Post()
  @ApiOperation({ summary: 'Create print template' })
  create(@Body() dto: CreatePrintTemplateDto, @AuthUser() user: IAuthUser) {
    return this.templateService.create(dto, user)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update print template' })
  update(@IdParam() id: number, @Body() dto: UpdatePrintTemplateDto, @AuthUser() user: IAuthUser) {
    return this.templateService.update(id, dto, user)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Disable print template' })
  delete(@IdParam() id: number, @AuthUser() user: IAuthUser) {
    return this.templateService.delete(id, user)
  }
}
