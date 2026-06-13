import { BusinessException } from '~/common/exceptions/biz.exception'

import { AiService } from './ai.service'

function createAiService(overrides: {
  aiLogRepository?: any
  prescriptionRepository?: any
  rxDetailRepository?: any
  visitRepository?: any
  petRepository?: any
} = {}) {
  return new AiService(
    overrides.aiLogRepository ?? {} as any,
    overrides.prescriptionRepository ?? {} as any,
    overrides.rxDetailRepository ?? {} as any,
    overrides.visitRepository ?? {} as any,
    overrides.petRepository ?? {} as any,
  ) as any
}

describe('aiService action missing-record boundaries', () => {
  it('rejects prescription reviews outside the current area', async () => {
    const service = createAiService({
      prescriptionRepository: {
        findOne: jest.fn(async () => null),
      },
    })

    await expect(service.reviewPrescription(8, { tenantId: 2, areaId: 3 }))
      .rejects
      .toBeInstanceOf(BusinessException)
  })
})
