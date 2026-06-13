import { BusinessException } from '~/common/exceptions/biz.exception'

import { VisitService } from './visit.service'

function createVisitService(overrides: {
  visitRepository?: any
  operationAuditRepository?: any
  storageRepository?: any
} = {}) {
  return new VisitService(
    overrides.visitRepository ?? {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    overrides.operationAuditRepository ?? {} as any,
    overrides.storageRepository ?? {} as any,
  ) as any
}

describe('visitService media file safety', () => {
  const originalOssPublicHosts = process.env.OSS_PUBLIC_HOSTS
  const originalOssDomain = process.env.OSS_DOMAIN
  const originalAppBaseUrl = process.env.APP_BASE_URL

  beforeEach(() => {
    ;(process.env as any).OSS_PUBLIC_HOSTS = 'https://media.example.test,cdn.example.test'
    ;(process.env as any).OSS_DOMAIN = ''
    ;(process.env as any).APP_BASE_URL = 'https://app.example.test'
  })

  afterEach(() => {
    ;(process.env as any).OSS_PUBLIC_HOSTS = originalOssPublicHosts
    ;(process.env as any).OSS_DOMAIN = originalOssDomain
    ;(process.env as any).APP_BASE_URL = originalAppBaseUrl
  })

  it('allows only protected local upload URLs for local visit media', () => {
    const service = createVisitService()

    expect(service.validateVisitMediaUrl('local', '/api/storage/file/token-123'))
      .toBe('/api/storage/file/token-123')
    expect(service.validateVisitMediaUrl('local', '/api/tools/storage/file/token-456'))
      .toBe('/api/tools/storage/file/token-456')
    expect(() => service.validateVisitMediaUrl('local', '/upload/tenant/2/area/3/image.png'))
      .toThrow(BusinessException)
    expect(() => service.validateVisitMediaUrl('local', '/assets/public.png'))
      .toThrow(BusinessException)
    expect(() => service.validateVisitMediaUrl('local', '/api/storage/file/../secret.png'))
      .toThrow(BusinessException)
  })

  it('rejects dangerous URL protocols for visit media files', () => {
    const service = createVisitService()

    expect(() => service.validateVisitMediaUrl('oss', 'javascript:alert(1)'))
      .toThrow(BusinessException)
    expect(() => service.validateVisitMediaUrl('oss', 'data:image/png;base64,AA=='))
      .toThrow(BusinessException)
    expect(() => service.validateVisitMediaUrl('oss', 'file:///etc/passwd'))
      .toThrow(BusinessException)
  })

  it('allows OSS media only from configured trusted hosts', () => {
    const service = createVisitService()

    expect(service.validateVisitMediaUrl('oss', 'https://media.example.test/tenant/2/a.png'))
      .toBe('https://media.example.test/tenant/2/a.png')
    expect(service.validateVisitMediaUrl('oss', 'https://cdn.example.test/tenant/2/a.png'))
      .toBe('https://cdn.example.test/tenant/2/a.png')
    expect(() => service.validateVisitMediaUrl('oss', 'https://evil.example.test/tenant/2/a.png'))
      .toThrow(BusinessException)
  })

  it('rejects media MIME types that do not match the declared file type', () => {
    const service = createVisitService()

    expect(() => service.validateVisitMediaMimeType('image', 'video/mp4'))
      .toThrow(BusinessException)
    expect(() => service.validateVisitMediaMimeType('video', 'image/png'))
      .toThrow(BusinessException)
    expect(() => service.validateVisitMediaMimeType('image', 'image/png'))
      .not
      .toThrow()
    expect(() => service.validateVisitMediaMimeType('video', 'video/mp4'))
      .not
      .toThrow()
  })
})

describe('visitService action missing-record boundaries', () => {
  function createMissingVisitService() {
    return createVisitService({
      visitRepository: {
        findOneBy: jest.fn(async () => null),
        findOne: jest.fn(async () => null),
      },
      operationAuditRepository: {
        save: jest.fn(),
        create: jest.fn((value: any) => value),
      },
    })
  }

  it('rejects locking EMR records outside the current area', async () => {
    const service = createMissingVisitService()

    await expect(service.lockEmr(8, { reason: 'lock' }, { tenantId: 2, areaId: 3 }))
      .rejects
      .toBeInstanceOf(BusinessException)
  })

  it('rejects signing EMR records outside the current area', async () => {
    const service = createMissingVisitService()

    await expect(service.signEmr(8, {}, { tenantId: 2, areaId: 3 }))
      .rejects
      .toBeInstanceOf(BusinessException)
  })

  it('rejects print audit records outside the current area', async () => {
    const service = createMissingVisitService()

    await expect(service.recordPrintAudit(8, { tenantId: 2, areaId: 3 }))
      .rejects
      .toBeInstanceOf(BusinessException)
  })

  it('rejects visit details outside the current area', async () => {
    const service = createMissingVisitService()

    await expect(service.findOneDetailed(8, { tenantId: 2, areaId: 3 }))
      .rejects
      .toBeInstanceOf(BusinessException)
  })

  it('rejects care followup lists outside the current area', async () => {
    const service = createMissingVisitService()

    await expect(service.listVisitCareFollowups(8, { tenantId: 2, areaId: 3 }))
      .rejects
      .toBeInstanceOf(BusinessException)
  })

  it('rejects media batch lists outside the current area', async () => {
    const service = createMissingVisitService()

    await expect(service.listVisitMediaBatches(8, { tenantId: 2, areaId: 3 }))
      .rejects
      .toBeInstanceOf(BusinessException)
  })

  it('rejects creating care followups outside the current area', async () => {
    const service = createMissingVisitService()

    await expect(service.createVisitCareFollowup(8, { careStage: 1 }, { tenantId: 2, areaId: 3 }))
      .rejects
      .toBeInstanceOf(BusinessException)
  })

  it('rejects creating media batches outside the current area', async () => {
    const service = createMissingVisitService()

    await expect(service.createVisitMediaBatch(8, { batchName: 'Images' }, { tenantId: 2, areaId: 3 }))
      .rejects
      .toBeInstanceOf(BusinessException)
  })

  it('rejects creating media files outside the current area', async () => {
    const service = createMissingVisitService()

    await expect(service.createVisitMediaFile(8, 1, {
      fileType: 'image',
      storageType: 'local',
      url: '/api/storage/file/token-123',
      mimeType: 'image/png',
    }, { tenantId: 2, areaId: 3 }))
      .rejects
      .toBeInstanceOf(BusinessException)
  })
})
