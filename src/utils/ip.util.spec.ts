import { getIp } from './ip.util'

describe('getIp security behavior', () => {
  it('prefers Fastify trusted-proxy resolved ip over spoofable forwarded headers', () => {
    const request = {
      ip: '203.0.113.10',
      headers: {
        'x-forwarded-for': '198.51.100.1',
        'x-real-ip': '198.51.100.2',
      },
      raw: {
        socket: {
          remoteAddress: '10.0.0.10',
        },
      },
    }

    expect(getIp(request as any)).toBe('203.0.113.10')
  })

  it('falls back to forwarded headers only when framework ip is unavailable', () => {
    const request = {
      headers: {
        'x-forwarded-for': '198.51.100.1, 198.51.100.2',
      },
    }

    expect(getIp(request as any)).toBe('198.51.100.1')
  })
})
