import type { ConfigKeyPaths } from '~/config'

import { ConfigService } from '@nestjs/config'

export function assertProductionSecurityConfig(configService: ConfigService<ConfigKeyPaths>) {
  if (process.env.NODE_ENV !== 'production')
    return

  const appConfig = configService.get('app', { infer: true })
  const securityConfig = configService.get('security', { infer: true })
  const swaggerConfig = configService.get('swagger', { infer: true })
  const weakSecrets = new Set(['', 'changeme', 'change-me', 'secret', 'jwt-secret', 'default'])
  const placeholderSecretPattern = /replace[-_ ]?with|example|placeholder|your[-_ ]?secret/i
  const errors: string[] = []

  const assertStrongSecret = (name: string, value?: string) => {
    const normalized = (value || '').trim()
    if (normalized.length < 32 || weakSecrets.has(normalized.toLowerCase()) || placeholderSecretPattern.test(normalized))
      errors.push(`${name} must be at least 32 characters and must not use a default value`)
  }

  assertStrongSecret('JWT_SECRET', securityConfig.jwtSecret)
  assertStrongSecret('REFRESH_TOKEN_SECRET', securityConfig.refreshSecret)
  assertStrongSecret('COOKIE_SECRET', securityConfig.cookieSecret)

  if (securityConfig.jwtSecret && securityConfig.jwtSecret === securityConfig.refreshSecret)
    errors.push('JWT_SECRET and REFRESH_TOKEN_SECRET must be different')
  if (securityConfig.jwtExprire > 30 * 60)
    errors.push('JWT_EXPIRE must not exceed 1800 seconds in production')
  if (securityConfig.refreshExpire > 30 * 24 * 60 * 60)
    errors.push('REFRESH_TOKEN_EXPIRE must not exceed 30 days in production')
  if (!appConfig.corsOrigins.length || appConfig.corsOrigins.includes('*'))
    errors.push('CORS_ORIGINS must explicitly list trusted origins in production')
  if (!appConfig.trustProxy)
    errors.push('TRUST_PROXY must be true in production and the app must run behind a trusted reverse proxy/WAF')
  if (appConfig.allowPublicRegister)
    errors.push('ALLOW_PUBLIC_REGISTER must be false in production')
  if (!appConfig.strictRbac)
    errors.push('STRICT_RBAC must be true in production')
  if (!appConfig.strictTenantContext)
    errors.push('STRICT_TENANT_CONTEXT must be true in production')
  if (swaggerConfig.enable)
    errors.push('SWAGGER_ENABLE must be false in production')

  if (errors.length)
    throw new Error(`Unsafe production security configuration:\n${errors.map(item => `- ${item}`).join('\n')}`)
}
