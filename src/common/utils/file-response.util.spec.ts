import { buildInlineContentDisposition, setProtectedFileResponseHeaders } from './file-response.util'

describe('protected file response headers', () => {
  it('builds an inline content disposition with ascii fallback and utf8 filename', () => {
    expect(buildInlineContentDisposition('病历影像 "A".png')).toBe(
      'inline; filename="____ _A_.png"; filename*=UTF-8\'\'%E7%97%85%E5%8E%86%E5%BD%B1%E5%83%8F%20%22A%22.png',
    )
  })

  it('sets no-store and nosniff headers for protected file streams', () => {
    const headers: Record<string, string> = {}
    const reply = {
      header: jest.fn((key: string, value: string) => {
        headers[key] = value
        return reply
      }),
    }

    setProtectedFileResponseHeaders(reply as any, {
      mimeType: 'image/png',
      filename: 'visit.png',
    })

    expect(headers).toMatchObject({
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': 'inline; filename="visit.png"; filename*=UTF-8\'\'visit.png',
    })
  })
})
