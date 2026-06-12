import axios from 'axios'

import { getIp, getIpAddress, isLAN } from './ip.util'

jest.mock('axios', () => ({
  get: jest.fn(),
}))

const mockedAxiosGet = axios.get as jest.Mock

describe('getIp security behavior', () => {
  beforeEach(() => {
    mockedAxiosGet.mockReset()
  })

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

  it('normalizes IPv4-mapped IPv6 addresses from the trusted framework ip', () => {
    const request = {
      ip: '::ffff:203.0.113.10',
      headers: {},
    }

    expect(getIp(request as any)).toBe('203.0.113.10')
  })

  it('detects private and loopback addresses as LAN addresses', () => {
    expect(isLAN('10.0.0.1')).toBe(true)
    expect(isLAN('172.16.0.1')).toBe(true)
    expect(isLAN('192.168.1.1')).toBe(true)
    expect(isLAN('127.0.0.1')).toBe(true)
    expect(isLAN('::1')).toBe(true)
    expect(isLAN('203.0.113.10')).toBe(false)
  })

  it('does not call third-party geo lookup for LAN or invalid addresses', async () => {
    await expect(getIpAddress('10.0.0.1')).resolves.toBe('\u5185\u7F51IP')
    await expect(getIpAddress('not-an-ip')).resolves.toBe('\u672A\u77E5IP')

    expect(mockedAxiosGet).not.toHaveBeenCalled()
  })
})
