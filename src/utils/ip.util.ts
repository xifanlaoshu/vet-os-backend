import type { FastifyRequest } from 'fastify'
import type { IncomingMessage } from 'node:http'
import axios from 'axios'

const IP_GEO_LOOKUP_TIMEOUT_MS = 1500
const LAN_IP_LABEL = '\u5185\u7F51IP'
const UNKNOWN_IP_LABEL = '\u672A\u77E5IP'
const GEO_LOOKUP_FAILED_LABEL = '\u7B2C\u4E09\u65B9\u63A5\u53E3\u8BF7\u6C42\u5931\u8D25'

function normalizeIp(ip: string | undefined) {
  return (ip ?? '').trim().replace(/^::ffff:/, '')
}

function isIPv4(ip: string) {
  const parts = ip.split('.')
  return parts.length === 4 && parts.every((part) => {
    if (!/^\d{1,3}$/.test(part))
      return false

    const value = Number(part)
    return value >= 0 && value <= 255
  })
}

export function isLAN(ip: string) {
  const normalizedIp = normalizeIp(ip).toLowerCase()
  if (!normalizedIp)
    return false
  if (['localhost', '::1'].includes(normalizedIp))
    return true
  if (/^(?:fc|fd|fe80):/i.test(normalizedIp))
    return true
  if (!isIPv4(normalizedIp))
    return false

  const [first, second] = normalizedIp.split('.').map(Number)
  return (
    first === 10
    || first === 127
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168)
    || (first === 169 && second === 254)
  )
}

export function getIp(request: FastifyRequest | IncomingMessage) {
  const req = request as any

  let ip: string
    = req?.ip
      || req?.raw?.connection?.remoteAddress
      || req?.raw?.socket?.remoteAddress
      || request.headers['x-forwarded-for']
      || request.headers['X-Forwarded-For']
      || request.headers['X-Real-IP']
      || request.headers['x-real-ip']
      || undefined
  if (ip && ip.split(',').length > 0)
    ip = ip.split(',')[0]

  return normalizeIp(ip)
}

export async function getIpAddress(ip: string) {
  const normalizedIp = normalizeIp(ip)
  if (!normalizedIp)
    return UNKNOWN_IP_LABEL
  if (isLAN(normalizedIp))
    return LAN_IP_LABEL
  if (!isIPv4(normalizedIp))
    return UNKNOWN_IP_LABEL

  try {
    let { data } = await axios.get(
      `https://whois.pconline.com.cn/ipJson.jsp?ip=${encodeURIComponent(normalizedIp)}&json=true`,
      {
        maxRedirects: 0,
        responseType: 'arraybuffer',
        timeout: IP_GEO_LOOKUP_TIMEOUT_MS,
      },
    )
    data = new TextDecoder('gbk').decode(data)
    data = JSON.parse(data)
    return data.addr.trim().split(' ').at(0)
  }
  catch {
    return GEO_LOOKUP_FAILED_LABEL
  }
}
