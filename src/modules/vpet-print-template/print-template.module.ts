import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PrintTemplateEntity } from './entities/print-template.entity'
import { PrintTemplateController } from './print-template.controller'
import { PrintTemplateService } from './print-template.service'

@Module({
  imports: [TypeOrmModule.forFeature([PrintTemplateEntity])],
  controllers: [PrintTemplateController],
  providers: [PrintTemplateService],
  exports: [PrintTemplateService, TypeOrmModule],
})
export class VpetPrintTemplateModule {}
