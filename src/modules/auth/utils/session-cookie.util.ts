import type { FastifyReply, FastifyRequest } from 'fastify'

import type { IAppConfig, ISecurityConfig } from '~/config'

import { randomBytes, timingSafeEqual } from 'node:crypto'

export const REFRESH_TOKEN_COOKIE = 'vet_os_refresh_token'
export const CSRF_TOKEN_COOKIE = 'vet_os_csrf_token'
export const CSRF_TOKEN_HEADER = 'x-csrf-token'

function isProduction() {
  return process.env.NODE_ENV === 'production'
}

function normalizePrefix(prefix: string) {
  return prefix.trim().replace(/^\/+|\/+$/g, '')
}

export function getRefreshCookiePath(appConfig: Pick<IAppConfig, 'globalPrefix'>) {
  const prefix = normalizePrefix(appConfig.globalPrefix || 'api')
  return `${prefix ? `/${prefix}` : ''}/auth/refresh`
}

export function generateCsrfToken() {
  return randomBytes(32).toString('base64url')
}

export function setAuthSessionCookies(
  reply: FastifyReply,
  appConfig: Pick<IAppConfig, 'globalPrefix'>,
  securityConfig: Pick<ISecurityConfig, 'refreshExpire'>,
  refreshToken: string,
) {
  const csrfToken = generateCsrfToken()
  const secure = isProduction()
  reply.setCookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: getRefreshCookiePath(appConfig),
    maxAge: securityConfig.refreshExpire,
  })
  reply.setCookie(CSRF_TOKEN_COOKIE, csrfToken, {
    httpOnly: false,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: securityConfig.refreshExpire,
  })
  return csrfToken
}

export function setCsrfCookie(
  reply: FastifyReply,
  securityConfig: Pick<ISecurityConfig, 'refreshExpire'>,
) {
  const csrfToken = generateCsrfToken()
  reply.setCookie(CSRF_TOKEN_COOKIE, csrfToken, {
    httpOnly: false,
    secure: isProduction(),
    sameSite: 'lax',
    path: '/',
    maxAge: securityConfig.refreshExpire,
  })
  return csrfToken
}

export function clearAuthSessionCookies(
  reply: FastifyReply,
  appConfig: Pick<IAppConfig, 'globalPrefix'>,
) {
  reply.setCookie(REFRESH_TOKEN_COOKIE, '', {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    path: getRefreshCookiePath(appConfig),
    maxAge: 0,
  })
  reply.setCookie(CSRF_TOKEN_COOKIE, '', {
    httpOnly: false,
    secure: isProduction(),
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

export function getRefreshTokenCookie(request: FastifyRequest) {
  return request.cookies?.[REFRESH_TOKEN_COOKIE]
}

export function isValidCsrfRequest(request: FastifyRequest) {
  const cookieToken = request.cookies?.[CSRF_TOKEN_COOKIE]
  const headerValue = request.headers[CSRF_TOKEN_HEADER]
  const headerToken = Array.isArray(headerValue) ? headerValue[0] : headerValue
  if (!cookieToken || !headerToken)
    return false

  const cookieBuffer = Buffer.from(cookieToken)
  const headerBuffer = Buffer.from(headerToken)
  return cookieBuffer.length === headerBuffer.length && timingSafeEqual(cookieBuffer, headerBuffer)
}
