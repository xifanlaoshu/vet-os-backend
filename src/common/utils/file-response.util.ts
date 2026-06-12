import { basename } from 'node:path'
import { FastifyReply } from 'fastify'

const FILE_RESPONSE_CACHE_CONTROL = 'no-store, max-age=0'

export function buildInlineContentDisposition(filename?: string | null) {
  const fallback = sanitizeAsciiFilename(filename || 'file')
  const encoded = encodeURIComponent(filename || fallback)
  return `inline; filename="${fallback}"; filename*=UTF-8''${encoded}`
}

export function setProtectedFileResponseHeaders(
  reply: FastifyReply,
  options: { mimeType: string, filename?: string | null },
) {
  reply.header('Content-Type', options.mimeType)
  reply.header('Cache-Control', FILE_RESPONSE_CACHE_CONTROL)
  reply.header('Pragma', 'no-cache')
  reply.header('Expires', '0')
  reply.header('X-Content-Type-Options', 'nosniff')
  reply.header('Content-Disposition', buildInlineContentDisposition(options.filename))
}

function sanitizeAsciiFilename(filename: string) {
  const base = basename(filename).replace(/[\r\n"]/g, '_')
  const ascii = base.replace(/[^\x20-\x7E]/g, '_').trim()
  return ascii || 'file'
}
