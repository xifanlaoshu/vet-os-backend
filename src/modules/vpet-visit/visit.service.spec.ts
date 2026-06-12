import { BusinessException } from '~/common/exceptions/biz.exception'

import { VisitService } from './visit.service'

function createVisitService() {
  return new VisitService(
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
    {} as any,
    {} as any,
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
    expect(service.validateVisitMediaUrl('local', '/upload/tenant/2/area/3/image.png'))
      .toBe('/upload/tenant/2/area/3/image.png')
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
