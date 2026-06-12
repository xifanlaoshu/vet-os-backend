import { Controller, Get, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { AuthUser } from '~/modules/auth/decorators/auth-user.decorator'
import { VpetAuditService } from './audit.service'
import { QueryAuditEventDto } from './dto/audit.dto'

@ApiTags('VPet - Audit')
@Controller('vpet/audit')
export class VpetAuditController {
  constructor(private readonly auditService: VpetAuditService) {}

  @Get('events')
  @ApiOperation({ summary: 'Unified VPet audit event list' })
  async events(@Query() dto: QueryAuditEventDto, @AuthUser() user: IAuthUser) {
    return this.auditService.listEvents(dto, user)
  }
}
