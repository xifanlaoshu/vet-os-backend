import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Brackets, Repository } from 'typeorm'
import { BusinessException } from '~/common/exceptions/biz.exception'
import { requireTenantAreaContext, requireTenantContext } from '~/common/utils/tenant-context.util'
import { paginate } from '~/helper/paginate'
import { CreatePrintTemplateDto, QueryPrintTemplateDto, UpdatePrintTemplateDto } from './dto/print-template.dto'
import { PrintTemplateEntity } from './entities/print-template.entity'

@Injectable()
export class PrintTemplateService {
  constructor(
    @InjectRepository(PrintTemplateEntity)
    private templateRepository: Repository<PrintTemplateEntity>,
  ) {}

  async list(dto: QueryPrintTemplateDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    const { page = 1, pageSize = 10, keyword, templateType, status } = dto
    const qb = this.templateRepository.createQueryBuilder('tpl')
      .where('tpl.tenantId = :tenantId', { tenantId })
      .andWhere('(tpl.areaId IS NULL OR tpl.areaId = :areaId)', { areaId })

    if (templateType)
      qb.andWhere('tpl.templateType = :templateType', { templateType })
    if (status !== undefined)
      qb.andWhere('tpl.status = :status', { status: Number(status) })
    if (keyword) {
      qb.andWhere(new Brackets((subQb) => {
        subQb
          .where('tpl.code LIKE :keyword', { keyword: `%${keyword}%` })
          .orWhere('tpl.name LIKE :keyword', { keyword: `%${keyword}%` })
          .orWhere('tpl.remark LIKE :keyword', { keyword: `%${keyword}%` })
      }))
    }

    qb.orderBy('tpl.templateType', 'ASC')
      .addOrderBy('tpl.defaultTemplate', 'DESC')
      .addOrderBy('tpl.areaId', 'DESC')
      .addOrderBy('tpl.createdAt', 'DESC')
    return paginate(qb, { page, pageSize })
  }

  async active(templateType: string, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    return this.templateRepository.find({
      where: [
        { tenantId, areaId, templateType, status: 1 },
        { tenantId, areaId: null, templateType, status: 1 },
      ],
      order: { defaultTemplate: 'DESC', areaId: 'DESC', id: 'ASC' },
    })
  }

  async create(dto: CreatePrintTemplateDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const { tenantId, areaId } = requireTenantAreaContext(context)
    await this.assertCodeAvailable(dto.code, tenantId)
    const entity = this.templateRepository.create({
      tenantId,
      areaId: dto.areaId ?? areaId ?? null,
      code: dto.code,
      name: dto.name,
      templateType: dto.templateType,
      paperType: dto.paperType ?? 'a4',
      defaultTemplate: dto.defaultTemplate ?? 0,
      templateHeader: dto.templateHeader ?? null,
      templateBody: dto.templateBody,
      templateFooter: dto.templateFooter ?? null,
      styleConfig: dto.styleConfig ? JSON.parse(dto.styleConfig) : null,
      variableSchema: dto.variableSchema ? JSON.parse(dto.variableSchema) : null,
      status: dto.status ?? 1,
      remark: dto.remark ?? null,
    })
    return this.templateRepository.save(entity)
  }

  async update(id: number, dto: UpdatePrintTemplateDto, context?: Pick<IAuthUser, 'tenantId'>) {
    const { tenantId } = requireTenantContext(context)
    const entity = await this.templateRepository.findOneBy({ id, tenantId })
    if (!entity)
      throw new BusinessException('Print template not found')
    if (dto.code !== entity.code)
      await this.assertCodeAvailable(dto.code, tenantId, id)

    Object.assign(entity, {
      areaId: dto.areaId ?? entity.areaId,
      code: dto.code,
      name: dto.name,
      templateType: dto.templateType,
      paperType: dto.paperType ?? entity.paperType,
      defaultTemplate: dto.defaultTemplate ?? entity.defaultTemplate,
      templateHeader: dto.templateHeader ?? null,
      templateBody: dto.templateBody,
      templateFooter: dto.templateFooter ?? null,
      styleConfig: dto.styleConfig ? JSON.parse(dto.styleConfig) : null,
      variableSchema: dto.variableSchema ? JSON.parse(dto.variableSchema) : null,
      status: dto.status ?? entity.status,
      remark: dto.remark ?? null,
    })
    return this.templateRepository.save(entity)
  }

  async delete(id: number, context?: Pick<IAuthUser, 'tenantId'>) {
    const { tenantId } = requireTenantContext(context)
    await this.templateRepository.update({ id, tenantId }, { status: 0 })
  }

  private async assertCodeAvailable(code: string, tenantId: number, excludeId?: number) {
    const qb = this.templateRepository.createQueryBuilder('tpl')
      .where('tpl.tenantId = :tenantId', { tenantId })
      .andWhere('tpl.code = :code', { code })
    if (excludeId)
      qb.andWhere('tpl.id <> :excludeId', { excludeId })
    if (await qb.getExists())
      throw new BusinessException('Print template code already exists')
  }
}
