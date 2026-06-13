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

      UNION ALL

      SELECT
        CONCAT('ai-', id) AS eventId,
        'ai' AS source,
        id AS sourceId,
        tenant_id AS tenantId,
        area_id AS areaId,
        COALESCE(biz_type, 'ai') AS bizType,
        biz_id AS bizId,
        task_type AS action,
        created_at AS occurredAt,
        NULL AS operatorId,
        NULL AS reason,
        request_payload AS beforeSnapshot,
        response_payload AS afterSnapshot,
        JSON_OBJECT(
          'taskType', task_type,
          'riskLevel', risk_level,
          'status', status,
          'warnings', warnings
        ) AS metadata
      FROM vpet_ai_log
      WHERE tenant_id = ? AND area_id = ?

      UNION ALL

      SELECT
        CONCAT('member-', id) AS eventId,
        'member' AS source,
        id AS sourceId,
        tenant_id AS tenantId,
        area_id AS areaId,
        'member_card' AS bizType,
        card_id AS bizId,
        CASE type
          WHEN 1 THEN 'member_recharge'
          WHEN 2 THEN 'member_refund'
          WHEN 3 THEN 'member_deduct'
          WHEN 4 THEN 'member_adjust'
          ELSE CONCAT('member_card_log_', type)
        END AS action,
        created_at AS occurredAt,
        operator_id AS operatorId,
        remark AS reason,
        NULL AS beforeSnapshot,
        NULL AS afterSnapshot,
        JSON_OBJECT(
          'cardId', card_id,
          'type', type,
          'amount', amount,
          'direction', direction,
          'balanceBefore', balance_before,
          'balanceAfter', balance_after,
          'billingId', billing_id
        ) AS metadata
      FROM vpet_member_card_log
      WHERE tenant_id = ? AND area_id = ?

      UNION ALL

      SELECT
        CONCAT('consent-', id) AS eventId,
        'consent' AS source,
        id AS sourceId,
        tenant_id AS tenantId,
        area_id AS areaId,
        'consent_record' AS bizType,
        id AS bizId,
        CASE status
          WHEN 2 THEN 'consent_signed'
          WHEN 3 THEN 'consent_voided'
          ELSE 'consent_created'
        END AS action,
        CASE
          WHEN status = 2 AND signed_at IS NOT NULL THEN signed_at
          ELSE updated_at
        END AS occurredAt,
        operator_id AS operatorId,
        remark AS reason,
        template_snapshot AS beforeSnapshot,
        JSON_OBJECT(
          'customerSnapshot', customer_snapshot,
          'petSnapshot', pet_snapshot,
          'doctorSnapshot', doctor_snapshot
        ) AS afterSnapshot,
        JSON_OBJECT(
          'recordNo', record_no,
          'templateId', template_id,
          'visitId', visit_id,
          'customerId', customer_id,
          'petId', pet_id,
          'doctorId', doctor_id,
          'title', title,
          'category', category,
          'riskLevel', risk_level,
          'status', status,
          'signedAt', signed_at
        ) AS metadata
      FROM vpet_consent_record
      WHERE tenant_id = ? AND area_id = ?

      UNION ALL

      SELECT
        CONCAT('insurance-', id) AS eventId,
        'insurance' AS source,
        id AS sourceId,
        tenant_id AS tenantId,
        area_id AS areaId,
        'insurance_claim' AS bizType,
        id AS bizId,
        CASE status
          WHEN 2 THEN 'insurance_submitted'
          WHEN 3 THEN 'insurance_settled'
          ELSE 'insurance_created'
        END AS action,
        CASE
          WHEN status = 3 AND settled_at IS NOT NULL THEN settled_at
          WHEN status = 2 AND submitted_at IS NOT NULL THEN submitted_at
          ELSE created_at
        END AS occurredAt,
        NULL AS operatorId,
        remark AS reason,
        customer_snapshot AS beforeSnapshot,
        pet_snapshot AS afterSnapshot,
        JSON_OBJECT(
          'claimNo', claim_no,
          'visitId', visit_id,
          'billingId', billing_id,
          'customerId', customer_id,
          'petId', pet_id,
          'providerName', provider_name,
          'policyNo', policy_no,
          'claimAmount', claim_amount,
          'approvedAmount', approved_amount,
          'status', status,
          'submittedAt', submitted_at,
          'settledAt', settled_at
        ) AS metadata
      FROM vpet_insurance_claim
      WHERE tenant_id = ? AND area_id = ?
    `

    const baseParams = Array.from({ length: 7 }).flatMap(() => [tenantId, areaId])
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
