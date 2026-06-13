import { BadRequestException } from '@nestjs/common'

import { VpetAuditService } from './audit.service'

function createAuditService(query = jest.fn()) {
  return new VpetAuditService({ query } as any) as any
}

describe('vpetAuditService unified audit source isolation', () => {
  it('aggregates all supported audit sources under the current tenant and area', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ total: 1 }])
      .mockResolvedValueOnce([{
        eventId: 'ai-7',
        source: 'ai',
        sourceId: 7,
        tenantId: 2,
        areaId: 3,
        bizType: 'prescription',
        bizId: 9,
        action: 'reviewPrescription',
        occurredAt: '2026-06-13 10:00:00',
        operatorId: null,
        reason: null,
        beforeSnapshot: '{"input":"masked"}',
        afterSnapshot: '{"result":"ok"}',
        metadata: '{"riskLevel":1}',
      }])
    const service = createAuditService(query)

    const result = await service.listEvents(
      { page: 1, pageSize: 20, source: 'ai', bizType: 'prescription', bizId: 9 },
      { tenantId: 2, areaId: 3 },
    )

    const countSql = query.mock.calls[0][0] as string
    const listSql = query.mock.calls[1][0] as string
    const listParams = query.mock.calls[1][1] as any[]
    const expectedSources = [
      'vpet_operation_audit_log',
      'vpet_emr_audit_log',
      'vpet_drug_stock_txn',
      'vpet_ai_log',
      'vpet_member_card_log',
      'vpet_consent_record',
      'vpet_insurance_claim',
    ]

    expectedSources.forEach((source) => {
      expect(countSql).toContain(source)
      expect(listSql).toContain(source)
    })
    expect(countSql.match(/WHERE tenant_id = \? AND area_id = \?/g)).toHaveLength(expectedSources.length)
    expect(listParams.slice(0, expectedSources.length * 2)).toEqual([
      2,
      3,
      2,
      3,
      2,
      3,
      2,
      3,
      2,
      3,
      2,
      3,
      2,
      3,
    ])
    expect(listParams.slice(14)).toEqual(['ai', 'prescription', 9, 20, 0])
    expect(result.items[0]).toEqual(expect.objectContaining({
      eventId: 'ai-7',
      source: 'ai',
      beforeSnapshot: { input: 'masked' },
      afterSnapshot: { result: 'ok' },
      metadata: { riskLevel: 1 },
    }))
  })

  it('rejects audit queries without an explicit tenant-area context', async () => {
    const query = jest.fn()
    const service = createAuditService(query)

    await expect(service.listEvents({}, { tenantId: 2 } as any))
      .rejects
      .toBeInstanceOf(BadRequestException)
    expect(query).not.toHaveBeenCalled()
  })
})
