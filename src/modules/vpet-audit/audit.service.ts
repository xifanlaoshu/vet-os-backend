import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { requireTenantAreaContext } from '~/common/utils/tenant-context.util'
import { createPaginationObject } from '~/helper/paginate/create-pagination'
import { QueryAuditEventDto } from './dto/audit.dto'

interface AuditEventRow {
  eventId: string
  source: string
  sourceId: number
  tenantId: number
  areaId: number
  bizType: string
  bizId: number | null
  action: string
  occurredAt: string | Date
  operatorId: number | null
  reason: string | null
  beforeSnapshot: any
  afterSnapshot: any
  metadata: any
}

@Injectable()
export class VpetAuditService {
  constructor(private readonly dataSource: DataSource) {}

  async listEvents(dto: QueryAuditEventDto, context?: Pick<IAuthUser, 'tenantId' | 'areaId'>) {
    const page = dto.page ?? 1
    const pageSize = Math.min(dto.pageSize ?? 20, 100)
    const { tenantId, areaId } = requireTenantAreaContext(context)

    const baseSql = `
      SELECT
        CONCAT('operation-', id) AS eventId,
        'operation' AS source,
        id AS sourceId,
        tenant_id AS tenantId,
        area_id AS areaId,
        biz_type AS bizType,
        biz_id AS bizId,
        action AS action,
        created_at AS occurredAt,
        operator_id AS operatorId,
        reason AS reason,
        before_snapshot AS beforeSnapshot,
        after_snapshot AS afterSnapshot,
        JSON_OBJECT() AS metadata
      FROM vpet_operation_audit_log
      WHERE tenant_id = ? AND area_id = ?

      UNION ALL

      SELECT
        CONCAT('emr-', id) AS eventId,
        'emr' AS source,
        id AS sourceId,
        tenant_id AS tenantId,
        area_id AS areaId,
        'emr' AS bizType,
        visit_id AS bizId,
        action AS action,
        created_at AS occurredAt,
        operator_id AS operatorId,
        reason AS reason,
        before_snapshot AS beforeSnapshot,
        after_snapshot AS afterSnapshot,
        JSON_OBJECT('visitId', visit_id, 'emrId', emr_id) AS metadata
      FROM vpet_emr_audit_log
      WHERE tenant_id = ? AND area_id = ?

      UNION ALL

      SELECT
        CONCAT('stock-', id) AS eventId,
        'stock' AS source,
        id AS sourceId,
        tenant_id AS tenantId,
        area_id AS areaId,
        'inventory_stock' AS bizType,
        drug_id AS bizId,
        CASE txn_type
          WHEN 1 THEN 'stock_in'
          WHEN 2 THEN 'stock_out'
          WHEN 3 THEN 'stock_adjust'
          WHEN 4 THEN 'stock_return'
          ELSE CONCAT('stock_txn_', txn_type)
        END AS action,
        txn_time AS occurredAt,
        operator_id AS operatorId,
        NULL AS reason,
        NULL AS beforeSnapshot,
        NULL AS afterSnapshot,
        JSON_OBJECT(
          'drugId', drug_id,
          'batchId', batch_id,
          'refType', ref_type,
          'refId', ref_id,
          'quantityBefore', quantity_before,
          'quantityChange', quantity_change,
          'quantityAfter', quantity_after
        ) AS metadata
      FROM vpet_drug_stock_txn
      WHERE tenant_id = ? AND area_id = ?
    `

    const baseParams = [tenantId, areaId, tenantId, areaId, tenantId, areaId]
    const whereParts: string[] = []
    const filterParams: any[] = []

    if (dto.source) {
      whereParts.push('source = ?')
      filterParams.push(dto.source)
    }
    if (dto.bizType) {
      whereParts.push('bizType = ?')
      filterParams.push(dto.bizType)
    }
    if (dto.bizId) {
      whereParts.push('bizId = ?')
      filterParams.push(dto.bizId)
    }
    if (dto.action) {
      whereParts.push('action = ?')
      filterParams.push(dto.action)
    }
    if (dto.startDate) {
      whereParts.push('occurredAt >= ?')
      filterParams.push(dto.startDate)
    }
    if (dto.endDate) {
      whereParts.push('occurredAt <= ?')
      filterParams.push(dto.endDate)
    }

    const outerWhere = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : ''
    const countRows = await this.dataSource.query(
      `SELECT COUNT(*) AS total FROM (${baseSql}) audit_events ${outerWhere}`,
      [...baseParams, ...filterParams],
    )
    const total = Number(countRows?.[0]?.total ?? 0)
    const rows = await this.dataSource.query(
      `SELECT * FROM (${baseSql}) audit_events ${outerWhere} ORDER BY occurredAt DESC, sourceId DESC LIMIT ? OFFSET ?`,
      [...baseParams, ...filterParams, pageSize, (page - 1) * pageSize],
    )

    return createPaginationObject({
      items: rows.map((row: AuditEventRow) => this.normalizeEvent(row)),
      totalItems: total,
      currentPage: page,
      limit: pageSize,
    })
  }

  private normalizeEvent(row: AuditEventRow) {
    return {
      ...row,
      beforeSnapshot: this.parseJson(row.beforeSnapshot),
      afterSnapshot: this.parseJson(row.afterSnapshot),
      metadata: this.parseJson(row.metadata) ?? {},
    }
  }

  private parseJson(value: any) {
    if (!value || typeof value !== 'string')
      return value
    try {
      return JSON.parse(value)
    }
    catch {
      return value
    }
  }
}
