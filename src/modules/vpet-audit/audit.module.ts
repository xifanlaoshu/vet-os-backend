import { Module } from '@nestjs/common'
import { VpetAuditController } from './audit.controller'
import { VpetAuditService } from './audit.service'

@Module({
  controllers: [VpetAuditController],
  providers: [VpetAuditService],
  exports: [VpetAuditService],
})
export class VpetAuditModule {}
