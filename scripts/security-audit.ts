import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { cwd } from 'node:process'

interface Finding {
  file: string
  line: number
  rule: string
  message: string
}

interface PublicRouteAllowlist {
  routes: Array<{
    method: string
    path: string
    access: 'AllowAnon' | 'Public'
    reason: string
  }>
}

interface ThrottleBypassAllowlist {
  entries: Array<{
    file: string
    target: string
    reason: string
  }>
}

interface RawSqlAllowlist {
  entries: Array<{
    file: string
    target: string
    reason: string
  }>
}

interface DataEgressAllowlist {
  routes: Array<{
    method: string
    path: string
    target: string
    reason: string
  }>
}

const root = cwd()
const sourceFiles = listSourceFiles(join(root, 'src'))

const findings: Finding[] = []

auditProductionEnvFile()
auditHttpRuntimeSecurityBootstrap()
auditPermissionMatrix()
auditTenantContextGuard()
auditJwtAuthGuardRegressionCoverage()
auditTenantAreaLifecycleFilters()
auditPublicAuthEndpointHardening()
auditStorageTokenExpiration()
auditProtectedUploadPersistenceAwait()
auditVisitMediaFileSafety()
auditPharmacyStockOutTransactionSafety()
auditStoreTransferWorkflowSafety()
auditMemberCardBalanceTransactionSafety()
auditBillingPaymentTransactionSafety()
auditBillingMemberCardPaymentBoundaries()
auditPrescriptionCurrentStaffTenantBoundary()
auditPrescriptionWorkflowStateBoundaries()
auditVisitDerivedRecordConsistency()
auditInsuranceWorkflowStateBoundaries()
auditAppointmentWorkflowStateBoundaries()
auditClinicalWorkflowStateBoundaries()
auditEmrActionMissingRecordBoundaries()
auditAiActionMissingRecordBoundaries()
auditTrustedClientIpResolution()
auditSanitizedExceptionLogging()
auditExternalHttpTimeouts()
auditCaptchaLogMasking()
auditRefreshTokenCleanupNullSafety()
auditProtectedFileResponseHeaders()
auditNetdiskPrivateDownloadTtl()

const rules = [
  {
    rule: 'no-console-in-runtime',
    pattern: /\bconsole\.\w+\s*\(/,
    message: 'Do not use console.* in backend runtime code; use Logger with sanitized messages.',
  },
  {
    rule: 'no-token-value-log',
    pattern: /logger\.(?:log|debug|warn|error)\([^)]*(?:accessToken|refreshToken|token\.value|value)[^)]*\)/i,
    message: 'Do not write raw token values to logs.',
  },
  {
    rule: 'no-md5-password-write',
    pattern: /password\s*:\s*md5\s*\(|\.password\s*=\s*md5\s*\(/,
    message: 'Do not store passwords with MD5; use hashPassword().',
  },
  {
    rule: 'no-plain-refresh-token-write',
    pattern: /refreshToken\.value\s*=\s*(?!this\.hashRefreshToken\()/,
    message: 'Do not store raw refresh tokens; store hashRefreshToken(refreshToken) only.',
  },
  {
    rule: 'no-access-token-cache-validation',
    pattern: /cache\s*:\s*true/,
    message: 'Do not cache token validity checks; logout, kick, and refresh rotation must take effect immediately.',
  },
]

const throttleBypassAllowlist = readThrottleBypassAllowlist()
const rawSqlAllowlist = readRawSqlAllowlist()
const dataEgressAllowlist = readDataEgressAllowlist()
const rawSqlSeen = new Set<string>()
const dataEgressSeen = new Set<string>()

for (const file of sourceFiles) {
  const absPath = file
  const relPath = normalizePath(relative(root, absPath))
  const content = readFileSync(absPath, 'utf8')
  const lines = content.split(/\r?\n/)
  auditControllerAccessMetadata(absPath, lines)
  auditVpetScopedRepositoryAccess(absPath, lines)
  auditVpetScopedQueryBuilderWhereOverride(absPath, lines)
  auditThrottleBypass(absPath, lines)
  auditRawSqlUsage(absPath, lines)
  auditDataEgressRoutes(absPath, lines)
  lines.forEach((lineText, index) => {
    if (lineText.trim().startsWith('//'))
      return auditCommentSwallowedCode(absPath, lineText, index + 1)
    for (const { rule, pattern, message } of rules) {
      if (!pattern.test(lineText))
        continue
      if (rule === 'no-console-in-runtime' && relPath === 'src/repl.ts')
        continue
      if (
        rule === 'no-plain-refresh-token-write'
        && /refreshToken\.value\s*=\s*this\.hashRefreshToken\(/.test(lineText)
      ) {
        continue
      }
      findings.push({
        file: relative(root, absPath),
        line: index + 1,
        rule,
        message,
      })
    }
    if (
      absPath.startsWith(join(root, 'src'))
      && /\w+\??\.(?:tenantId|areaId)\s*(?:\?\?|\|\|)\s*1/.test(lineText)
    ) {
      findings.push({
        file: relative(root, absPath),
        line: index + 1,
        rule: 'no-tenant-context-default',
        message: 'Do not default tenantId/areaId to 1 in scoped business services; require explicit tenant context.',
      })
    }
  })
}

auditRawSqlAllowlistStale()
auditDataEgressAllowlistStale()

function auditProductionEnvFile() {
  const envPath = join(root, '.env.production')
  if (!existsSync(envPath))
    return

  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/)
  const values = new Map<string, { value: string, line: number }>()

  lines.forEach((lineText, index) => {
    const trimmed = lineText.trim()
    if (!trimmed || trimmed.startsWith('#'))
      return
    const [key, ...rest] = trimmed.split('=')
    if (!key || !rest.length)
      return
    values.set(key.trim(), {
      value: rest.join('=').split('#')[0].trim(),
      line: index + 1,
    })
  })

  const weakSecrets = new Set(['', 'changeme', 'change-me', 'secret', 'jwt-secret', 'default', 'admin!@#123', 'cookie-secret', 'dev-cookie-secret-change-me'])
  for (const key of ['JWT_SECRET', 'REFRESH_TOKEN_SECRET', 'COOKIE_SECRET']) {
    const item = values.get(key)
    if (!item || item.value.length < 32 || weakSecrets.has(item.value.toLowerCase())) {
      findings.push({
        file: '.env.production',
        line: item?.line ?? 1,
        rule: 'production-weak-secret',
        message: `${key} must be set to a strong non-default value in production configuration.`,
      })
    }
  }

  if (values.get('JWT_SECRET')?.value && values.get('JWT_SECRET')?.value === values.get('REFRESH_TOKEN_SECRET')?.value) {
    findings.push({
      file: '.env.production',
      line: values.get('REFRESH_TOKEN_SECRET')?.line ?? 1,
      rule: 'production-secret-reuse',
      message: 'JWT_SECRET and REFRESH_TOKEN_SECRET must be different.',
    })
  }

  const swaggerEnable = values.get('SWAGGER_ENABLE')
  if (swaggerEnable?.value.toLowerCase() === 'true') {
    findings.push({
      file: '.env.production',
      line: swaggerEnable.line,
      rule: 'production-swagger-enabled',
      message: 'SWAGGER_ENABLE must be false in production configuration.',
    })
  }

  const jwtExpire = Number(values.get('JWT_EXPIRE')?.value)
  if (Number.isFinite(jwtExpire) && jwtExpire > 30 * 60) {
    findings.push({
      file: '.env.production',
      line: values.get('JWT_EXPIRE')?.line ?? 1,
      rule: 'production-token-ttl-too-long',
      message: 'JWT_EXPIRE must not exceed 1800 seconds in production configuration.',
    })
  }

  const trustProxy = values.get('TRUST_PROXY')
  if (trustProxy?.value.toLowerCase() !== 'true') {
    findings.push({
      file: '.env.production',
      line: trustProxy?.line ?? 1,
      rule: 'production-trust-proxy-required',
      message: 'TRUST_PROXY must be true in production and deployment must place the app behind a trusted reverse proxy/WAF.',
    })
  }
}

function auditHttpRuntimeSecurityBootstrap() {
  const mainPath = join(root, 'src', 'main.ts')
  const productionSecurityPath = join(root, 'src', 'common', 'utils', 'production-security.util.ts')
  if (!existsSync(mainPath))
    return

  const content = readFileSync(mainPath, 'utf8')
  const productionSecurityContent = existsSync(productionSecurityPath)
    ? readFileSync(productionSecurityPath, 'utf8')
    : ''
  const requiredPatterns = [
    {
      pattern: /assertProductionSecurityConfig\(configService\)/,
      rule: 'production-security-config-check-required',
      message: 'Production startup must validate secrets, CORS, Swagger, RBAC, and tenant context settings before listening.',
    },
    {
      pattern: /app\.use\(helmet\(/,
      rule: 'helmet-required',
      message: 'Helmet must be enabled for HTTP security headers.',
    },
    {
      pattern: /app\.enableCors\(\{[\s\S]*corsOrigins\.includes\(origin\)/,
      rule: 'cors-allowlist-required',
      message: 'CORS must use an explicit origin allowlist outside development.',
    },
    {
      pattern: /allowedHeaders:\s*\[[\s\S]*['"`]Authorization['"`][\s\S]*['"`]X-Area-Id['"`]/,
      rule: 'cors-auth-area-headers-required',
      message: 'CORS allowed headers must include Authorization and X-Area-Id for tenant-area scoped requests.',
    },
  ]

  requiredPatterns.forEach(({ pattern, rule, message }) => {
    if (pattern.test(content))
      return
    findings.push({
      file: 'src/main.ts',
      line: 1,
      rule,
      message,
    })
  })

  if (!/placeholderSecretPattern/.test(productionSecurityContent)) {
    findings.push({
      file: 'src/common/utils/production-security.util.ts',
      line: 1,
      rule: 'production-placeholder-secret-rejected',
      message: 'Production startup must reject placeholder secrets from environment templates.',
    })
  }
}

function auditPermissionMatrix() {
  const matrixPath = join(root, 'security', 'api-permission-matrix.md')
  if (!existsSync(matrixPath)) {
    findings.push({
      file: 'security/api-permission-matrix.md',
      line: 1,
      rule: 'missing-api-permission-matrix',
      message: 'Run pnpm security:matrix to generate the API permission matrix.',
    })
    return
  }

  const lines = readFileSync(matrixPath, 'utf8').split(/\r?\n/)
  const publicAllowlist = readPublicRouteAllowlist()
  const matrixPublicRoutes = new Set<string>()
  lines.forEach((lineText, index) => {
    if (lineText.includes('`MISSING`')) {
      findings.push({
        file: 'security/api-permission-matrix.md',
        line: index + 1,
        rule: 'api-permission-matrix-missing-access',
        message: 'API permission matrix contains a route with missing access metadata.',
      })
    }

    const publicRoute = parsePublicRouteMatrixLine(lineText)
    if (!publicRoute)
      return

    const key = routeKey(publicRoute)
    matrixPublicRoutes.add(key)
    if (!publicAllowlist.has(key)) {
      findings.push({
        file: 'security/api-permission-matrix.md',
        line: index + 1,
        rule: 'public-route-not-allowlisted',
        message: `${publicRoute.access} route ${publicRoute.method} ${publicRoute.path} must be documented in security/public-route-allowlist.json.`,
      })
    }
  })

  for (const key of publicAllowlist.keys()) {
    if (matrixPublicRoutes.has(key))
      continue
    findings.push({
      file: 'security/public-route-allowlist.json',
      line: 1,
      rule: 'public-route-allowlist-stale',
      message: `Allowlisted public route is not present in the generated API matrix: ${key}.`,
    })
  }
}

function auditTenantContextGuard() {
  const appModulePath = join(root, 'src', 'app.module.ts')
  if (!existsSync(appModulePath)) {
    findings.push({
      file: 'src/app.module.ts',
      line: 1,
      rule: 'missing-app-module',
      message: 'AppModule is required for global security guard registration.',
    })
    return
  }

  const appModule = readFileSync(appModulePath, 'utf8')
  if (!appModule.includes('TenantContextGuard')) {
    findings.push({
      file: 'src/app.module.ts',
      line: 1,
      rule: 'missing-tenant-context-guard',
      message: 'TenantContextGuard must be registered globally to block business access before tenant and area selection.',
    })
  }

  const tokenServicePath = join(root, 'src', 'modules', 'auth', 'services', 'token.service.ts')
  if (!existsSync(tokenServicePath))
    return
  const tokenServiceLines = readFileSync(tokenServicePath, 'utf8').split(/\r?\n/)
  tokenServiceLines.forEach((lineText, index) => {
    if (!/contextSelected\s*:\s*true/.test(lineText))
      return
    findings.push({
      file: 'src/modules/auth/services/token.service.ts',
      line: index + 1,
      rule: 'no-default-context-selected-token',
      message: 'Access tokens must not default contextSelected to true; users must explicitly select tenant and area.',
    })
  })
}

function auditJwtAuthGuardRegressionCoverage() {
  const guardPath = join(root, 'src', 'modules', 'auth', 'guards', 'jwt-auth.guard.ts')
  const specPath = join(root, 'src', 'modules', 'auth', 'guards', 'jwt-auth.guard.spec.ts')
  if (!existsSync(guardPath))
    return

  if (!existsSync(specPath)) {
    findings.push({
      file: 'src/modules/auth/guards/jwt-auth.guard.spec.ts',
      line: 1,
      rule: 'missing-jwt-auth-guard-security-regression-tests',
      message: 'JwtAuthGuard must have regression tests for blacklist, token staleness, password version, SSE uid, and tenant-area authorization boundaries.',
    })
    return
  }

  const guardContent = readFileSync(guardPath, 'utf8')
  const specContent = readFileSync(specPath, 'utf8')
  const requiredGuardPatterns = [
    {
      pattern: /genTokenBlacklistKey\(token\)/,
      rule: 'jwt-guard-blacklist-check-required',
      message: 'JwtAuthGuard must reject blacklisted access tokens before business context resolution.',
    },
    {
      pattern: /tokenService\.checkAccessToken\(token\)/,
      rule: 'jwt-guard-access-token-db-check-required',
      message: 'JwtAuthGuard must validate the presented access token against server-side token state.',
    },
    {
      pattern: /request\.headers\[['"`]x-area-id['"`]\]/,
      rule: 'jwt-guard-area-header-resolution-required',
      message: 'JwtAuthGuard must resolve tenant and area context from X-Area-Id.',
    },
    {
      pattern: /getPasswordVersionByUid\(request\.user\.uid\)/,
      rule: 'jwt-guard-password-version-check-required',
      message: 'JwtAuthGuard must invalidate tokens after password-version changes.',
    },
    {
      pattern: /!this\.appConfig\.multiDeviceLogin/,
      rule: 'jwt-guard-single-device-check-required',
      message: 'JwtAuthGuard must reject stale tokens when single-device login is enabled.',
    },
    {
      pattern: /Number\(uid\)\s*!==\s*request\.user\.uid/,
      rule: 'jwt-guard-sse-uid-check-required',
      message: 'JwtAuthGuard must reject SSE route uid values that differ from the authenticated user.',
    },
  ]

  requiredGuardPatterns.forEach(({ pattern, rule, message }) => {
    if (pattern.test(guardContent))
      return
    findings.push({
      file: 'src/modules/auth/guards/jwt-auth.guard.ts',
      line: 1,
      rule,
      message,
    })
  })

  const requiredSpecPatterns = [
    {
      pattern: /rejects blacklisted access tokens/i,
      message: 'Missing JwtAuthGuard regression test for blacklisted token rejection.',
    },
    {
      pattern: /rejects stale access tokens/i,
      message: 'Missing JwtAuthGuard regression test for stale Redis current-token rejection.',
    },
    {
      pattern: /password version changes/i,
      message: 'Missing JwtAuthGuard regression test for password-version invalidation.',
    },
    {
      pattern: /SSE requests whose route uid does not match/i,
      message: 'Missing JwtAuthGuard regression test for SSE uid mismatch rejection.',
    },
    {
      pattern: /unauthorized requested areas/i,
      message: 'Missing JwtAuthGuard regression test for unauthorized X-Area-Id rejection.',
    },
  ]

  requiredSpecPatterns.forEach(({ pattern, message }) => {
    if (pattern.test(specContent))
      return
    findings.push({
      file: 'src/modules/auth/guards/jwt-auth.guard.spec.ts',
      line: 1,
      rule: 'incomplete-jwt-auth-guard-security-regression-tests',
      message,
    })
  })
}

function auditTenantAreaLifecycleFilters() {
  const tenantServicePath = join(root, 'src', 'modules', 'system', 'tenant', 'tenant.service.ts')
  const tenantControllerPath = join(root, 'src', 'modules', 'system', 'tenant', 'tenant.controller.ts')
  if (!existsSync(tenantServicePath) || !existsSync(tenantControllerPath))
    return

  const serviceContent = readFileSync(tenantServicePath, 'utf8')
  const controllerContent = readFileSync(tenantControllerPath, 'utf8')

  const requiredServicePatterns = [
    {
      pattern: /tenant\.id\s*=\s*ua\.tenant_id\s+AND\s+tenant\.status\s*=\s*1/,
      message: 'User tenant-area context options must filter disabled tenants.',
    },
    {
      pattern: /area\.id\s*=\s*ua\.area_id\s+AND\s+area\.tenant_id\s*=\s*ua\.tenant_id\s+AND\s+area\.status\s*=\s*1/,
      message: 'User tenant-area context options must filter disabled areas.',
    },
    {
      pattern: /tenant\.id\s*=\s*area\.(?:tenant_id|tenantId)\s+AND\s+tenant\.status\s*=\s*1/,
      message: 'Platform-admin and area option queries must filter disabled tenants.',
    },
    {
      pattern: /innerJoinAndMapOne\(\s*['"`]area\.tenant['"`]\s*,\s*TenantEntity\s*,\s*['"`]tenant['"`]\s*,\s*['"`]tenant\.id\s*=\s*area\.tenantId\s+AND\s+tenant\.status\s*=\s*1['"`]\s*\)/,
      message: 'Tenant area selectors must use an inner join to exclude areas under disabled tenants.',
    },
    {
      pattern: /\.where\(\s*['"`]area\.status\s*=\s*1['"`]\s*\)/,
      message: 'Platform-admin and area option queries must filter disabled areas.',
    },
  ]

  requiredServicePatterns.forEach(({ pattern, message }) => {
    if (pattern.test(serviceContent))
      return
    findings.push({
      file: 'src/modules/system/tenant/tenant.service.ts',
      line: 1,
      rule: 'tenant-area-lifecycle-filter-required',
      message,
    })
  })

  if (!/resolveDefaultContext\(\s*user\.uid\s*,\s*user\.platformAdmin\s*\)/.test(controllerContent)) {
    findings.push({
      file: 'src/modules/system/tenant/tenant.controller.ts',
      line: 1,
      rule: 'tenant-context-platform-admin-required',
      message: 'Tenant context bootstrap must pass platformAdmin so platform administrators can resolve all active areas safely.',
    })
  }
}

function auditPublicAuthEndpointHardening() {
  const authControllerPath = join(root, 'src', 'modules', 'auth', 'auth.controller.ts')
  if (!existsSync(authControllerPath))
    return

  const lines = readFileSync(authControllerPath, 'utf8').split(/\r?\n/)
  const content = lines.join('\n')

  if (!/allowPublicRegister/.test(content) || !/if\s*\(\s*!this\.appConfig\.allowPublicRegister\s*\)/.test(content)) {
    findings.push({
      file: 'src/modules/auth/auth.controller.ts',
      line: 1,
      rule: 'public-register-config-gate-required',
      message: 'Public registration must be gated by allowPublicRegister so production SaaS can disable self-service signup.',
    })
  }

  const requiredThrottledRoutes = [
    { decorator: '@Post(\'login\')', route: 'POST /auth/login' },
    { decorator: '@Post(\'register\')', route: 'POST /auth/register' },
    { decorator: '@Post(\'refresh\')', route: 'POST /auth/refresh' },
  ]

  requiredThrottledRoutes.forEach(({ decorator, route }) => {
    const routeIndex = lines.findIndex(line => line.includes(decorator))
    if (routeIndex < 0)
      return
    const decoratorBlock = lines.slice(routeIndex, Math.min(lines.length, routeIndex + 8)).join('\n')
    if (decoratorBlock.includes('@Throttle'))
      return
    findings.push({
      file: 'src/modules/auth/auth.controller.ts',
      line: routeIndex + 1,
      rule: 'public-auth-endpoint-throttle-required',
      message: `${route} must declare a local @Throttle limit in addition to global throttling.`,
    })
  })
}

function auditStorageTokenExpiration() {
  const storageEntityPath = join(root, 'src', 'modules', 'tools', 'storage', 'storage.entity.ts')
  const uploadServicePath = join(root, 'src', 'modules', 'tools', 'upload', 'upload.service.ts')
  const storageServicePath = join(root, 'src', 'modules', 'tools', 'storage', 'storage.service.ts')

  const requiredFiles = [
    storageEntityPath,
    uploadServicePath,
    storageServicePath,
  ]
  if (requiredFiles.some(file => !existsSync(file)))
    return

  const storageEntity = readFileSync(storageEntityPath, 'utf8')
  const uploadService = readFileSync(uploadServicePath, 'utf8')
  const storageService = readFileSync(storageServicePath, 'utf8')

  if (!storageEntity.includes('tokenExpiresAt')) {
    findings.push({
      file: 'src/modules/tools/storage/storage.entity.ts',
      line: 1,
      rule: 'missing-storage-token-expiration-field',
      message: 'Anonymous storage tokens must have an expiration field.',
    })
  }

  if (!/tokenExpiresAt\s*=\s*dayjs\(\)\.add\(/.test(uploadService) || !/tokenExpiresAt,/.test(uploadService)) {
    findings.push({
      file: 'src/modules/tools/upload/upload.service.ts',
      line: 1,
      rule: 'missing-storage-token-expiration-write',
      message: 'Uploads must write tokenExpiresAt for anonymous storage links.',
    })
  }
  auditAnonymousTokenTtl(uploadServicePath, uploadService)
  auditAnonymousTokenTtl(storageServicePath, storageService)

  if (!/!storage\?\.tokenExpiresAt\s*\|\|\s*storage\.tokenExpiresAt\.getTime\(\)\s*<=\s*Date\.now\(\)/.test(storageService)) {
    findings.push({
      file: 'src/modules/tools/storage/storage.service.ts',
      line: 1,
      rule: 'missing-storage-token-expiration-check',
      message: 'Anonymous storage token access must reject missing or expired tokenExpiresAt values.',
    })
  }
}

function auditAnonymousTokenTtl(filePath: string, content: string) {
  const relPath = normalizePath(relative(root, filePath))
  const minutesMatch = content.match(/anonymousTokenTtlMinutes\s*=\s*(\d+)/)
  if (!minutesMatch) {
    findings.push({
      file: relPath,
      line: 1,
      rule: 'anonymous-storage-token-minute-ttl-required',
      message: 'Anonymous protected-file tokens must use a minutes-based TTL so public preview links stay short lived.',
    })
    return
  }

  const ttlMinutes = Number(minutesMatch[1])
  if (ttlMinutes > 10) {
    findings.push({
      file: relPath,
      line: 1,
      rule: 'anonymous-storage-token-ttl-too-long',
      message: 'Anonymous protected-file token TTL must not exceed 10 minutes.',
    })
  }
}

function auditProtectedUploadPersistenceAwait() {
  const uploadServicePath = join(root, 'src', 'modules', 'tools', 'upload', 'upload.service.ts')
  if (!existsSync(uploadServicePath))
    return

  const lines = readFileSync(uploadServicePath, 'utf8').split(/\r?\n/)
  lines.forEach((lineText, index) => {
    if (!/saveLocalFile\(/.test(lineText))
      return
    if (/await\s+saveLocalFile\(/.test(lineText))
      return
    findings.push({
      file: 'src/modules/tools/upload/upload.service.ts',
      line: index + 1,
      rule: 'protected-upload-write-must-be-awaited',
      message: 'Protected uploads must await local file persistence before saving metadata or returning file access information.',
    })
  })
}

function auditVisitMediaFileSafety() {
  const servicePath = join(root, 'src', 'modules', 'vpet-visit', 'visit.service.ts')
  const specPath = join(root, 'src', 'modules', 'vpet-visit', 'visit.service.spec.ts')
  if (!existsSync(servicePath))
    return

  const serviceContent = readFileSync(servicePath, 'utf8')
  const requiredServicePatterns = [
    {
      pattern: /validateVisitMediaUrl\(dto\.storageType,\s*dto\.url\)/,
      rule: 'visit-media-url-validation-required',
      message: 'Visit media file creation must validate local and OSS media URLs before saving.',
    },
    {
      pattern: /\['javascript',\s*'data',\s*'file',\s*'vbscript'\]\.includes\(scheme\)/,
      rule: 'visit-media-dangerous-protocol-block-required',
      message: 'Visit media URL validation must reject script, data, file, and vbscript protocols.',
    },
    {
      pattern: /!url\.startsWith\('\/api\/storage\/file\/'\)\s*&&\s*!url\.startsWith\('\/upload\/'\)/,
      rule: 'visit-media-local-path-scope-required',
      message: 'Local visit media URLs must be restricted to protected storage or upload paths.',
    },
    {
      pattern: /allowedHosts\.has\(parsed\.host\)/,
      rule: 'visit-media-oss-host-allowlist-required',
      message: 'OSS visit media URLs must be restricted to configured trusted hosts.',
    },
    {
      pattern: /validateVisitMediaMimeType\(dto\.fileType,\s*dto\.mimeType\)/,
      rule: 'visit-media-mime-validation-required',
      message: 'Visit media file creation must validate declared media type against MIME type.',
    },
  ]

  requiredServicePatterns.forEach(({ pattern, rule, message }) => {
    if (pattern.test(serviceContent))
      return
    findings.push({
      file: 'src/modules/vpet-visit/visit.service.ts',
      line: 1,
      rule,
      message,
    })
  })

  if (!existsSync(specPath)) {
    findings.push({
      file: 'src/modules/vpet-visit/visit.service.spec.ts',
      line: 1,
      rule: 'missing-visit-media-safety-regression-tests',
      message: 'Visit media URL and MIME validation must have regression tests for dangerous protocols, local paths, OSS host allowlist, and MIME mismatch.',
    })
    return
  }

  const specContent = readFileSync(specPath, 'utf8')
  const requiredSpecPatterns = [
    /protected local upload URLs/i,
    /dangerous URL protocols/i,
    /configured trusted hosts/i,
    /MIME types that do not match/i,
  ]
  requiredSpecPatterns.forEach((pattern) => {
    if (pattern.test(specContent))
      return
    findings.push({
      file: 'src/modules/vpet-visit/visit.service.spec.ts',
      line: 1,
      rule: 'incomplete-visit-media-safety-regression-tests',
      message: 'Visit media safety tests must cover protected local URLs, dangerous protocols, OSS trusted hosts, and MIME mismatches.',
    })
  })
}

function auditPharmacyStockOutTransactionSafety() {
  const serviceFile = 'src/modules/vpet-pharmacy/pharmacy.service.ts'
  const specFile = 'src/modules/vpet-pharmacy/pharmacy.service.spec.ts'
  const servicePath = join(root, ...serviceFile.split('/'))
  const specPath = join(root, ...specFile.split('/'))
  if (!existsSync(servicePath))
    return

  const serviceContent = readFileSync(servicePath, 'utf8')
  const requiredAdminPatterns = [
    {
      pattern: /async updateChargeItem[\s\S]*Charge item not found[\s\S]*chargeItemRepository\.update\(\{ id, tenantId \}/,
      rule: 'pharmacy-charge-item-update-scoped-record-required',
      message: 'Charge item updates must first load the record in the current tenant before mutating service pricing data.',
    },
    {
      pattern: /async updateBatch[\s\S]*Drug batch not found[\s\S]*batchRepository\.update\(\{\s*id,\s*tenantId,\s*areaId,/,
      rule: 'pharmacy-batch-update-scoped-record-required',
      message: 'Drug batch updates must reject out-of-scope tenant-area IDs before mutating area-scoped stock metadata.',
    },
  ]
  requiredAdminPatterns.forEach(({ pattern, rule, message }) => {
    if (pattern.test(serviceContent))
      return
    findings.push({
      file: serviceFile,
      line: 1,
      rule,
      message,
    })
  })

  const requiredServicePatterns = [
    {
      pattern: /dataSource\.transaction/,
      rule: 'pharmacy-stock-out-transaction-required',
      message: 'Pharmacy stock out must run inside a database transaction so batch updates and stock transactions commit atomically.',
    },
    {
      pattern: /\.setLock\(\s*['"`]pessimistic_write['"`]\s*\)/,
      rule: 'pharmacy-stock-out-batch-lock-required',
      message: 'Pharmacy stock out must pessimistically lock candidate batches before calculating available stock to prevent concurrent negative stock.',
    },
    {
      pattern: /batch\.tenantId\s*=\s*:tenantId/,
      rule: 'pharmacy-stock-out-tenant-scope-required',
      message: 'Pharmacy stock out batch selection must stay within the current tenant.',
    },
    {
      pattern: /batch\.areaId\s*=\s*:areaId/,
      rule: 'pharmacy-stock-out-area-scope-required',
      message: 'Pharmacy stock out batch selection must stay within the current area because stock is area scoped.',
    },
    {
      pattern: /quantityBefore[\s\S]*quantityChange[\s\S]*quantityAfter/,
      rule: 'pharmacy-stock-out-ledger-snapshot-required',
      message: 'Pharmacy stock out must write before/change/after quantity snapshots into stock transaction ledger records.',
    },
  ]

  requiredServicePatterns.forEach(({ pattern, rule, message }) => {
    if (pattern.test(serviceContent))
      return
    findings.push({
      file: serviceFile,
      line: 1,
      rule,
      message,
    })
  })

  if (!existsSync(specPath)) {
    findings.push({
      file: specFile,
      line: 1,
      rule: 'missing-pharmacy-stock-out-safety-tests',
      message: 'Pharmacy stock out must have regression tests for batch locking, tenant-area scope, ledger snapshots, and insufficient stock.',
    })
    return
  }

  const specContent = readFileSync(specPath, 'utf8')
  const adminSpecPatterns = [
    /charge item updates outside the current tenant/i,
    /batch updates outside the current area/i,
  ]
  adminSpecPatterns.forEach((pattern) => {
    if (pattern.test(specContent))
      return
    findings.push({
      file: specFile,
      line: 1,
      rule: 'incomplete-pharmacy-admin-boundary-tests',
      message: 'Pharmacy admin boundary tests must cover charge item and batch updates outside the current scope.',
    })
  })

  const requiredSpecPatterns = [
    /locks tenant-area drug batches before stock out/i,
    /pessimistic_write/,
    /quantityBefore/,
    /tenant-area stock is insufficient/i,
  ]
  requiredSpecPatterns.forEach((pattern) => {
    if (pattern.test(specContent))
      return
    findings.push({
      file: specFile,
      line: 1,
      rule: 'incomplete-pharmacy-stock-out-safety-tests',
      message: 'Pharmacy stock out tests must cover pessimistic locking, tenant-area scope, ledger snapshots, and insufficient stock without mutation.',
    })
  })
}

function auditStoreTransferWorkflowSafety() {
  const serviceFile = 'src/modules/vpet-store/store.service.ts'
  const specFile = 'src/modules/vpet-store/store.service.spec.ts'
  const servicePath = join(root, ...serviceFile.split('/'))
  const specPath = join(root, ...specFile.split('/'))
  if (!existsSync(servicePath))
    return

  const serviceContent = readFileSync(servicePath, 'utf8')
  const requiredServicePatterns = [
    {
      pattern: /Only pending transfers can be approved/,
      rule: 'store-transfer-approve-pending-only-required',
      message: 'Store transfers must only be approved from pending status.',
    },
    {
      pattern: /Transfer must be approved before completion/,
      rule: 'store-transfer-complete-approved-only-required',
      message: 'Store transfers must only be completed after approval.',
    },
    {
      pattern: /dataSource\.transaction/,
      rule: 'store-transfer-complete-transaction-required',
      message: 'Store transfer completion must run inside a transaction so source and target stock updates commit atomically.',
    },
    {
      pattern: /\.setLock\(\s*['"`]pessimistic_write['"`]\s*\)[\s\S]*transfer\.id\s*=\s*:id/,
      rule: 'store-transfer-row-lock-required',
      message: 'Store transfer completion must pessimistically lock the transfer row before checking and changing status.',
    },
    {
      pattern: /\.setLock\(\s*['"`]pessimistic_write['"`]\s*\)[\s\S]*stock\.storeId\s*=\s*:storeId/,
      rule: 'store-transfer-stock-lock-required',
      message: 'Store transfer completion must pessimistically lock source and target stock rows before changing quantities.',
    },
    {
      pattern: /Insufficient source stock/,
      rule: 'store-transfer-source-stock-check-required',
      message: 'Store transfer completion must reject insufficient source stock before mutating stock rows.',
    },
  ]

  requiredServicePatterns.forEach(({ pattern, rule, message }) => {
    if (pattern.test(serviceContent))
      return
    findings.push({
      file: serviceFile,
      line: 1,
      rule,
      message,
    })
  })

  if (!existsSync(specPath)) {
    findings.push({
      file: specFile,
      line: 1,
      rule: 'missing-store-transfer-workflow-tests',
      message: 'Store transfer workflow must have regression tests for approval status, transfer row lock, stock row locks, and insufficient source stock.',
    })
    return
  }

  const specContent = readFileSync(specPath, 'utf8')
  const requiredSpecPatterns = [
    /not pending/i,
    /locks transfer and stock rows/i,
    /pessimistic_write/,
    /locked source stock is insufficient/i,
  ]
  requiredSpecPatterns.forEach((pattern) => {
    if (pattern.test(specContent))
      return
    findings.push({
      file: specFile,
      line: 1,
      rule: 'incomplete-store-transfer-workflow-tests',
      message: 'Store transfer tests must cover non-pending approval, transfer and stock locks, and insufficient source stock without mutation.',
    })
  })
}

function auditMemberCardBalanceTransactionSafety() {
  const serviceFile = 'src/modules/vpet-member/member.service.ts'
  const specFile = 'src/modules/vpet-member/member.service.spec.ts'
  const servicePath = join(root, ...serviceFile.split('/'))
  const specPath = join(root, ...specFile.split('/'))
  if (!existsSync(servicePath))
    return

  const serviceContent = readFileSync(servicePath, 'utf8')
  const requiredServicePatterns = [
    {
      pattern: /dataSource\.transaction/,
      rule: 'member-card-balance-transaction-required',
      message: 'Member card recharge and deduction must run inside database transactions so balance changes and ledger logs commit atomically.',
    },
    {
      pattern: /\.setLock\(\s*['"`]pessimistic_write['"`]\s*\)/,
      rule: 'member-card-balance-lock-required',
      message: 'Member card balance mutations must pessimistically lock the card row before calculating balance.',
    },
    {
      pattern: /Recharge amount must be greater than 0/,
      rule: 'member-card-recharge-positive-required',
      message: 'Member card recharge must reject zero or negative amounts.',
    },
    {
      pattern: /Deduct amount must be greater than 0/,
      rule: 'member-card-deduct-positive-required',
      message: 'Member card deduction must reject zero or negative amounts.',
    },
    {
      pattern: /Member card is not active/,
      rule: 'member-card-active-status-required',
      message: 'Member card balance mutations must reject inactive cards.',
    },
    {
      pattern: /balanceBefore[\s\S]*balanceAfter/,
      rule: 'member-card-ledger-snapshot-required',
      message: 'Member card balance mutations must write before/after balance snapshots to the ledger.',
    },
  ]

  requiredServicePatterns.forEach(({ pattern, rule, message }) => {
    if (pattern.test(serviceContent))
      return
    findings.push({
      file: serviceFile,
      line: 1,
      rule,
      message,
    })
  })

  if (!existsSync(specPath)) {
    findings.push({
      file: specFile,
      line: 1,
      rule: 'missing-member-card-balance-safety-tests',
      message: 'Member card balance mutations must have regression tests for transactions, locks, positive amounts, insufficient balance, and ledger snapshots.',
    })
    return
  }

  const specContent = readFileSync(specPath, 'utf8')
  const requiredSpecPatterns = [
    /locks member cards when recharging/i,
    /locks member cards when deducting/i,
    /pessimistic_write/,
    /zero or negative member card balance operations/i,
    /balanceBefore/,
  ]
  requiredSpecPatterns.forEach((pattern) => {
    if (pattern.test(specContent))
      return
    findings.push({
      file: specFile,
      line: 1,
      rule: 'incomplete-member-card-balance-safety-tests',
      message: 'Member card balance tests must cover locking, positive amount guards, insufficient balance, and before/after ledger snapshots.',
    })
  })
}

function auditBillingPaymentTransactionSafety() {
  const serviceFile = 'src/modules/vpet-billing/billing.service.ts'
  const specFile = 'src/modules/vpet-billing/billing.service.spec.ts'
  const servicePath = join(root, ...serviceFile.split('/'))
  const specPath = join(root, ...specFile.split('/'))
  if (!existsSync(servicePath))
    return

  const serviceContent = readFileSync(servicePath, 'utf8')
  const requiredServicePatterns = [
    {
      pattern: /Payment amount must be greater than 0/,
      rule: 'billing-payment-positive-required',
      message: 'Billing payments must reject zero or negative amounts.',
    },
    {
      pattern: /Billing not found/,
      rule: 'billing-workflow-missing-bill-required',
      message: 'Billing payment and refund workflow actions must reject missing or out-of-scope bills instead of silently returning null.',
    },
    {
      pattern: /Billing is not payable/,
      rule: 'billing-payment-final-state-block-required',
      message: 'Billing payments must reject fully paid or fully refunded bills.',
    },
    {
      pattern: /\.setLock\(\s*['"`]pessimistic_write['"`]\s*\)[\s\S]*bill\.id\s*=\s*:id/,
      rule: 'billing-row-lock-required',
      message: 'Billing payment and refund must pessimistically lock the bill row before calculating outstanding or refundable amounts.',
    },
    {
      pattern: /\.setLock\(\s*['"`]pessimistic_write['"`]\s*\)[\s\S]*card\.(?:id|customerId)\s*=\s*:/,
      rule: 'billing-member-card-lock-required',
      message: 'Billing member-card payment and refund must pessimistically lock the member card before mutating balance.',
    },
  ]

  requiredServicePatterns.forEach(({ pattern, rule, message }) => {
    if (pattern.test(serviceContent))
      return
    findings.push({
      file: serviceFile,
      line: 1,
      rule,
      message,
    })
  })

  if (!existsSync(specPath)) {
    findings.push({
      file: specFile,
      line: 1,
      rule: 'missing-billing-payment-safety-tests',
      message: 'Billing payment and refund must have regression tests for row locks, positive payment amounts, scoped missing bills, and member-card locks.',
    })
    return
  }

  const specContent = readFileSync(specPath, 'utf8')
  const requiredSpecPatterns = [
    /locks billing rows before payment/i,
    /zero payment amounts/i,
    /locks billing rows before refunding/i,
    /pessimistic_write/,
  ]
  requiredSpecPatterns.forEach((pattern) => {
    if (pattern.test(specContent))
      return
    findings.push({
      file: specFile,
      line: 1,
      rule: 'incomplete-billing-payment-safety-tests',
      message: 'Billing payment tests must cover bill row locks, zero payment rejection, refund row locks, and scoped missing bills.',
    })
  })
}

function auditBillingMemberCardPaymentBoundaries() {
  const servicePath = join(root, 'src', 'modules', 'vpet-billing', 'billing.service.ts')
  const specPath = join(root, 'src', 'modules', 'vpet-billing', 'billing.service.spec.ts')
  if (!existsSync(servicePath))
    return

  const serviceContent = readFileSync(servicePath, 'utf8')
  const requiredServicePatterns = [
    {
      pattern: /Number\(card\.customerId\)\s*!==\s*Number\(bill\.customerId\)/,
      rule: 'billing-member-card-owner-check-required',
      message: 'Member-card payments must verify that an explicit card belongs to the billing customer.',
    },
    {
      pattern: /Number\(customerId\)\s*!==\s*Number\(bill\.customerId\)/,
      rule: 'billing-member-payment-customer-check-required',
      message: 'Member-card payments must reject requested customerId values that differ from the billing customer.',
    },
    {
      pattern: /detailRepository\.find\(\{\s*where:\s*\{\s*billingId:\s*billId,\s*tenantId,\s*areaId\s*\}\s*\}\)/,
      rule: 'billing-recalculation-detail-scope-required',
      message: 'Billing total recalculation must aggregate details only within the current tenant and area.',
    },
    {
      pattern: /billingRepository\.update\(\{\s*id:\s*billId,\s*tenantId,\s*areaId\s*\},\s*\{\s*totalAmount\s*\}\)/,
      rule: 'billing-recalculation-update-scope-required',
      message: 'Billing total recalculation must update bills only within the current tenant and area.',
    },
  ]

  requiredServicePatterns.forEach(({ pattern, rule, message }) => {
    if (pattern.test(serviceContent))
      return
    findings.push({
      file: 'src/modules/vpet-billing/billing.service.ts',
      line: 1,
      rule,
      message,
    })
  })

  if (!existsSync(specPath)) {
    findings.push({
      file: 'src/modules/vpet-billing/billing.service.spec.ts',
      line: 1,
      rule: 'missing-billing-member-card-boundary-tests',
      message: 'Billing member-card payment boundaries must have regression tests for explicit card owner mismatch and requested customer mismatch.',
    })
    return
  }

  const specContent = readFileSync(specPath, 'utf8')
  const requiredSpecPatterns = [
    /card belongs to another customer/i,
    /requested customer differs from the bill customer/i,
    /only for the billing customer/i,
    /current tenant and area/i,
  ]
  requiredSpecPatterns.forEach((pattern) => {
    if (pattern.test(specContent))
      return
    findings.push({
      file: 'src/modules/vpet-billing/billing.service.spec.ts',
      line: 1,
      rule: 'incomplete-billing-member-card-boundary-tests',
      message: 'Billing member-card tests must cover card owner mismatch, requested customer mismatch, and successful billing-customer payment.',
    })
  })
}

function auditPrescriptionCurrentStaffTenantBoundary() {
  const servicePath = join(root, 'src', 'modules', 'vpet-prescription', 'prescription.service.ts')
  const specPath = join(root, 'src', 'modules', 'vpet-prescription', 'prescription.service.spec.ts')
  if (!existsSync(servicePath))
    return

  const serviceContent = readFileSync(servicePath, 'utf8')
  const requiredServicePatterns = [
    {
      pattern: /resolveCurrentStaffDoctorId\(options\.currentUserId,\s*tenantId\)/,
      rule: 'prescription-current-staff-tenant-argument-required',
      message: 'Prescription workflows must resolve current medical staff within the current tenant.',
    },
    {
      pattern: /where:\s*\{\s*userId:\s*currentUserId,\s*tenantId,\s*status:\s*1\s*\}/,
      rule: 'prescription-current-staff-tenant-filter-required',
      message: 'Prescription current-staff lookup must filter by tenantId to prevent cross-tenant staff identity mapping.',
    },
  ]

  requiredServicePatterns.forEach(({ pattern, rule, message }) => {
    if (pattern.test(serviceContent))
      return
    findings.push({
      file: 'src/modules/vpet-prescription/prescription.service.ts',
      line: 1,
      rule,
      message,
    })
  })

  if (!existsSync(specPath)) {
    findings.push({
      file: 'src/modules/vpet-prescription/prescription.service.spec.ts',
      line: 1,
      rule: 'missing-prescription-current-staff-tenant-tests',
      message: 'Prescription current-staff tenant boundary must have regression tests for tenant-scoped staff lookup and review flow.',
    })
    return
  }

  const specContent = readFileSync(specPath, 'utf8')
  const requiredSpecPatterns = [
    /only within the current tenant/i,
    /when reviewing prescriptions/i,
  ]
  requiredSpecPatterns.forEach((pattern) => {
    if (pattern.test(specContent))
      return
    findings.push({
      file: 'src/modules/vpet-prescription/prescription.service.spec.ts',
      line: 1,
      rule: 'incomplete-prescription-current-staff-tenant-tests',
      message: 'Prescription current-staff tenant tests must cover direct lookup and at least one workflow that uses it.',
    })
  })
}

function auditPrescriptionWorkflowStateBoundaries() {
  const serviceFile = 'src/modules/vpet-prescription/prescription.service.ts'
  const specFile = 'src/modules/vpet-prescription/prescription.service.spec.ts'
  const servicePath = join(root, ...serviceFile.split('/'))
  const specPath = join(root, ...specFile.split('/'))
  if (!existsSync(servicePath))
    return

  const serviceContent = readFileSync(servicePath, 'utf8')
  const requiredServicePatterns = [
    {
      pattern: /Only draft prescriptions can be submitted for review/,
      rule: 'prescription-submit-draft-only-required',
      message: 'Prescription submission must only allow draft prescriptions to enter pending review.',
    },
    {
      pattern: /Only pending-review prescriptions can be reviewed/,
      rule: 'prescription-review-pending-only-required',
      message: 'Prescription review must only allow pending-review prescriptions to be approved or voided.',
    },
    {
      pattern: /Prescription review status must be approved or voided/,
      rule: 'prescription-review-target-status-required',
      message: 'Prescription review must restrict target status to approved or voided.',
    },
    {
      pattern: /Only reviewed prescriptions can be dispensed/,
      rule: 'prescription-dispense-reviewed-only-required',
      message: 'Prescription dispensing must only allow reviewed prescriptions so stock cannot be deducted from draft or pending orders.',
    },
    {
      pattern: /Prescription not found/,
      rule: 'prescription-dispense-missing-record-required',
      message: 'Prescription dispensing must reject missing or out-of-scope prescriptions instead of silently returning null.',
    },
  ]

  requiredServicePatterns.forEach(({ pattern, rule, message }) => {
    if (pattern.test(serviceContent))
      return
    findings.push({
      file: serviceFile,
      line: 1,
      rule,
      message,
    })
  })

  if (!existsSync(specPath)) {
    findings.push({
      file: specFile,
      line: 1,
      rule: 'missing-prescription-workflow-state-tests',
      message: 'Prescription workflow state boundaries must have regression tests for submit, review, review target status, and dispense restrictions.',
    })
    return
  }

  const specContent = readFileSync(specPath, 'utf8')
  const requiredSpecPatterns = [
    /not drafts/i,
    /not pending review/i,
    /unsupported review target statuses/i,
    /before review approval/i,
    /outside the current area/i,
  ]
  requiredSpecPatterns.forEach((pattern) => {
    if (pattern.test(specContent))
      return
    findings.push({
      file: specFile,
      line: 1,
      rule: 'incomplete-prescription-workflow-state-tests',
      message: 'Prescription workflow tests must cover non-draft submit, non-pending review, unsupported review target status, and dispensing before approval.',
    })
  })
}

function auditVisitDerivedRecordConsistency() {
  const targets: Array<{
    domain: string
    serviceFile: string
    specFile: string
    customerPattern: RegExp
    petPattern: RegExp
    billingPattern?: RegExp
    specCustomerPattern: RegExp
    specPetPattern: RegExp
    specBillingPattern?: RegExp
  }> = [
    {
      domain: 'hospitalization',
      serviceFile: 'src/modules/vpet-hospitalization/hospitalization.service.ts',
      specFile: 'src/modules/vpet-hospitalization/hospitalization.service.spec.ts',
      customerPattern: /Hospitalization customer does not match visit customer/,
      petPattern: /Hospitalization pet does not match visit pet/,
      specCustomerPattern: /selected customer differs from the visit customer/i,
      specPetPattern: /selected pet differs from the visit pet/i,
    },
    {
      domain: 'lab',
      serviceFile: 'src/modules/vpet-lab/lab.service.ts',
      specFile: 'src/modules/vpet-lab/lab.service.spec.ts',
      customerPattern: /Lab customer does not match visit customer/,
      petPattern: /Lab pet does not match visit pet/,
      specCustomerPattern: /selected customer differs from the visit customer/i,
      specPetPattern: /selected pet differs from the visit pet/i,
    },
    {
      domain: 'reminder',
      serviceFile: 'src/modules/vpet-reminder/reminder.service.ts',
      specFile: 'src/modules/vpet-reminder/reminder.service.spec.ts',
      customerPattern: /Visit does not belong to the selected customer/,
      petPattern: /Visit does not belong to the selected pet/,
      specCustomerPattern: /selected customer differs from the linked visit customer/i,
      specPetPattern: /selected pet differs from the linked visit pet/i,
    },
    {
      domain: 'insurance',
      serviceFile: 'src/modules/vpet-insurance/insurance.service.ts',
      specFile: 'src/modules/vpet-insurance/insurance.service.spec.ts',
      customerPattern: /Insurance claim data does not match visit/,
      petPattern: /Insurance claim data does not match visit/,
      billingPattern: /Billing does not match visit/,
      specCustomerPattern: /selected customer differs from the visit customer/i,
      specPetPattern: /selected pet differs from the visit pet/i,
      specBillingPattern: /selected bill belongs to another visit/i,
    },
  ]

  targets.forEach((target) => {
    const servicePath = join(root, ...target.serviceFile.split('/'))
    const specPath = join(root, ...target.specFile.split('/'))
    if (!existsSync(servicePath))
      return

    const serviceContent = readFileSync(servicePath, 'utf8')
    if (!target.customerPattern.test(serviceContent)) {
      findings.push({
        file: target.serviceFile,
        line: 1,
        rule: `${target.domain}-visit-customer-consistency-required`,
        message: `${target.domain} records created from a visit must reject customer values that differ from the visit customer.`,
      })
    }
    if (!target.petPattern.test(serviceContent)) {
      findings.push({
        file: target.serviceFile,
        line: 1,
        rule: `${target.domain}-visit-pet-consistency-required`,
        message: `${target.domain} records created from a visit must reject pet values that differ from the visit pet.`,
      })
    }
    if (target.billingPattern && !target.billingPattern.test(serviceContent)) {
      findings.push({
        file: target.serviceFile,
        line: 1,
        rule: `${target.domain}-visit-billing-consistency-required`,
        message: `${target.domain} records created from a visit must reject billing values that differ from the visit bill.`,
      })
    }

    if (!existsSync(specPath)) {
      findings.push({
        file: target.specFile,
        line: 1,
        rule: `missing-${target.domain}-visit-consistency-tests`,
        message: `${target.domain} visit-derived record consistency must have regression tests for customer, pet, and linked billing mismatch where applicable.`,
      })
      return
    }

    const specContent = readFileSync(specPath, 'utf8')
    const hasRequiredVisitTests = target.specCustomerPattern.test(specContent) && target.specPetPattern.test(specContent)
    const hasRequiredBillingTests = !target.specBillingPattern || target.specBillingPattern.test(specContent)
    if (!hasRequiredVisitTests || !hasRequiredBillingTests) {
      findings.push({
        file: target.specFile,
        line: 1,
        rule: `incomplete-${target.domain}-visit-consistency-tests`,
        message: `${target.domain} visit-derived record consistency tests must cover customer mismatch, pet mismatch, and linked billing mismatch where applicable.`,
      })
    }
  })
}

function auditInsuranceWorkflowStateBoundaries() {
  const serviceFile = 'src/modules/vpet-insurance/insurance.service.ts'
  const specFile = 'src/modules/vpet-insurance/insurance.service.spec.ts'
  const servicePath = join(root, ...serviceFile.split('/'))
  const specPath = join(root, ...specFile.split('/'))
  if (!existsSync(servicePath))
    return

  const serviceContent = readFileSync(servicePath, 'utf8')
  const requiredServicePatterns = [
    {
      pattern: /Only draft insurance claims can be submitted/,
      rule: 'insurance-submit-draft-only-required',
      message: 'Insurance claims must only be submitted from draft status.',
    },
    {
      pattern: /Only submitted insurance claims can be settled/,
      rule: 'insurance-settle-submitted-only-required',
      message: 'Insurance claims must only be settled after submission.',
    },
    {
      pattern: /Approved amount cannot exceed claim amount/,
      rule: 'insurance-approved-amount-cap-required',
      message: 'Insurance settlement must not approve an amount greater than the original claim amount.',
    },
    {
      pattern: /Insurance claim not found/,
      rule: 'insurance-workflow-missing-claim-required',
      message: 'Insurance workflow actions must reject missing or out-of-scope claims instead of silently updating nothing.',
    },
  ]

  requiredServicePatterns.forEach(({ pattern, rule, message }) => {
    if (pattern.test(serviceContent))
      return
    findings.push({
      file: serviceFile,
      line: 1,
      rule,
      message,
    })
  })

  if (!existsSync(specPath)) {
    findings.push({
      file: specFile,
      line: 1,
      rule: 'missing-insurance-workflow-state-tests',
      message: 'Insurance workflow state boundaries must have regression tests for submit, settle, approved amount caps, and scoped missing records.',
    })
    return
  }

  const specContent = readFileSync(specPath, 'utf8')
  const requiredSpecPatterns = [
    /not drafts/i,
    /not submitted/i,
    /exceed the claim amount/i,
    /outside the current area/i,
  ]
  requiredSpecPatterns.forEach((pattern) => {
    if (pattern.test(specContent))
      return
    findings.push({
      file: specFile,
      line: 1,
      rule: 'incomplete-insurance-workflow-state-tests',
      message: 'Insurance workflow tests must cover non-draft submit, non-submitted settle, approved amount cap, and scoped missing records.',
    })
  })
}

function auditAppointmentWorkflowStateBoundaries() {
  const serviceFile = 'src/modules/vpet-appointment/appointment.service.ts'
  const specFile = 'src/modules/vpet-appointment/appointment.service.spec.ts'
  const servicePath = join(root, ...serviceFile.split('/'))
  const specPath = join(root, ...specFile.split('/'))
  if (!existsSync(servicePath))
    return

  const serviceContent = readFileSync(servicePath, 'utf8')
  const requiredServicePatterns = [
    {
      pattern: /Appointment status must be changed through workflow actions/,
      rule: 'appointment-direct-status-update-block-required',
      message: 'Appointment status must not be mutable through generic update; use explicit workflow actions for check-in, cancel, and completion.',
    },
    {
      pattern: /Checked-in appointment cannot change core scheduling data/,
      rule: 'appointment-checked-in-core-update-block-required',
      message: 'Checked-in appointments must not allow customer, pet, doctor, or appointment time changes that would desynchronize the visit chain.',
    },
    {
      pattern: /Checked-in appointment cannot be canceled/,
      rule: 'appointment-checked-in-cancel-block-required',
      message: 'Checked-in or completed appointments must not be cancelable because they may already have generated clinical records.',
    },
    {
      pattern: /Appointment has generated a visit and cannot be canceled/,
      rule: 'appointment-visit-cancel-block-required',
      message: 'Appointments with an existing visit must not be cancelable because canceling would orphan clinical records.',
    },
    {
      pattern: /async updateDoctor[\s\S]*Medical staff not found[\s\S]*doctorRepository\.update\(\{ id, tenantId \}/,
      rule: 'appointment-doctor-update-scoped-record-required',
      message: 'Medical staff updates must first load the record in the current tenant instead of silently updating zero rows for out-of-scope IDs.',
    },
    {
      pattern: /async deleteDoctor[\s\S]*Medical staff not found[\s\S]*doctorRepository\.delete\(\{ id, tenantId \}/,
      rule: 'appointment-doctor-delete-scoped-record-required',
      message: 'Medical staff deletes must reject out-of-scope IDs before deleting.',
    },
    {
      pattern: /async deleteShift[\s\S]*Shift not found[\s\S]*shiftRepository\.delete\(\{ id, tenantId \}/,
      rule: 'appointment-shift-delete-scoped-record-required',
      message: 'Shift deletes must reject out-of-scope IDs before deleting.',
    },
    {
      pattern: /validateDoctorUser[\s\S]*userAreaRepository\.findOneBy\(\{ userId, tenantId \}\)[\s\S]*System user is not assigned to current tenant/,
      rule: 'appointment-doctor-user-tenant-assignment-required',
      message: 'Binding medical staff to a system user must verify that the user belongs to or is assigned to the current tenant.',
    },
  ]

  requiredServicePatterns.forEach(({ pattern, rule, message }) => {
    if (pattern.test(serviceContent))
      return
    findings.push({
      file: serviceFile,
      line: 1,
      rule,
      message,
    })
  })

  if (!existsSync(specPath)) {
    findings.push({
      file: specFile,
      line: 1,
      rule: 'missing-appointment-workflow-state-tests',
      message: 'Appointment workflow state boundaries must have regression tests for direct status changes, checked-in core edits, checked-in cancel, and visit cancel.',
    })
    return
  }

  const specContent = readFileSync(specPath, 'utf8')
  const requiredSpecPatterns = [
    /direct status changes/i,
    /core scheduling changes after check-in/i,
    /already checked in/i,
    /generated a visit/i,
    /already canceled/i,
    /outside the current area/i,
    /users outside the current tenant/i,
    /users granted to the current tenant/i,
    /medical staff outside the current tenant/i,
    /shifts outside the current tenant/i,
  ]
  requiredSpecPatterns.forEach((pattern) => {
    if (pattern.test(specContent))
      return
    findings.push({
      file: specFile,
      line: 1,
      rule: 'incomplete-appointment-workflow-state-tests',
      message: 'Appointment workflow state tests must cover direct status changes, checked-in core edits, checked-in cancel, visit cancel, idempotent cancel, and scoped missing records.',
    })
  })
}

function auditClinicalWorkflowStateBoundaries() {
  const targets = [
    {
      domain: 'reminder',
      serviceFile: 'src/modules/vpet-reminder/reminder.service.ts',
      specFile: 'src/modules/vpet-reminder/reminder.service.spec.ts',
      servicePatterns: [
        /Completed or canceled reminders cannot be completed again/,
        /Completed reminders cannot be canceled/,
      ],
      specPatterns: [
        /already canceled/i,
        /already completed/i,
        /cancel idempotent/i,
      ],
    },
    {
      domain: 'consent',
      serviceFile: 'src/modules/vpet-consent/consent.service.ts',
      specFile: 'src/modules/vpet-consent/consent.service.spec.ts',
      servicePatterns: [
        /Consent record has already been signed/,
        /Signed consent record cannot be voided/,
      ],
      specPatterns: [
        /already signed/i,
        /voiding consent records that are already signed/i,
        /void idempotent/i,
      ],
    },
    {
      domain: 'lab',
      serviceFile: 'src/modules/vpet-lab/lab.service.ts',
      specFile: 'src/modules/vpet-lab/lab.service.spec.ts',
      servicePatterns: [
        /Only pending or sampled lab orders can be submitted to LIS/,
      ],
      specPatterns: [
        /completed lab orders to LIS/i,
      ],
    },
  ]

  targets.forEach((target) => {
    const servicePath = join(root, ...target.serviceFile.split('/'))
    const specPath = join(root, ...target.specFile.split('/'))
    if (!existsSync(servicePath))
      return

    const serviceContent = readFileSync(servicePath, 'utf8')
    target.servicePatterns.forEach((pattern) => {
      if (pattern.test(serviceContent))
        return
      findings.push({
        file: target.serviceFile,
        line: 1,
        rule: `${target.domain}-clinical-workflow-state-required`,
        message: `${target.domain} clinical workflow actions must enforce terminal-state boundaries.`,
      })
    })

    if (!existsSync(specPath)) {
      findings.push({
        file: target.specFile,
        line: 1,
        rule: `missing-${target.domain}-clinical-workflow-tests`,
        message: `${target.domain} clinical workflow state boundaries must have regression tests.`,
      })
      return
    }

    const specContent = readFileSync(specPath, 'utf8')
    target.specPatterns.forEach((pattern) => {
      if (pattern.test(specContent))
        return
      findings.push({
        file: target.specFile,
        line: 1,
        rule: `incomplete-${target.domain}-clinical-workflow-tests`,
        message: `${target.domain} clinical workflow state tests are missing a required terminal-state case.`,
      })
    })
  })
}

function auditEmrActionMissingRecordBoundaries() {
  const serviceFile = 'src/modules/vpet-visit/visit.service.ts'
  const specFile = 'src/modules/vpet-visit/visit.service.spec.ts'
  const servicePath = join(root, ...serviceFile.split('/'))
  const specPath = join(root, ...specFile.split('/'))
  if (!existsSync(servicePath))
    return

  const serviceContent = readFileSync(servicePath, 'utf8')
  const requiredActionBlocks = [
    /async findOneDetailed[\s\S]*throw new BusinessException\(['"`]Visit not found['"`]\)/,
    /async listVisitCareFollowups[\s\S]*throw new BusinessException\(['"`]Visit not found['"`]\)/,
    /async listVisitMediaBatches[\s\S]*throw new BusinessException\(['"`]Visit not found['"`]\)/,
    /async lockEmr[\s\S]*throw new BusinessException\(['"`]Visit not found['"`]\)/,
    /async requestUnlockEmr[\s\S]*throw new BusinessException\(['"`]Visit not found['"`]\)/,
    /async signEmr[\s\S]*throw new BusinessException\(['"`]Visit not found['"`]\)/,
    /async recordPrintAudit[\s\S]*throw new BusinessException\(['"`]Visit not found['"`]\)/,
    /async endConsultation[\s\S]*throw new BusinessException\(['"`]Visit not found['"`]\)/,
    /async createVisitCareFollowup[\s\S]*throw new BusinessException\(['"`]Visit not found['"`]\)/,
    /async createVisitMediaBatch[\s\S]*throw new BusinessException\(['"`]Visit not found['"`]\)/,
    /async createVisitMediaFile[\s\S]*throw new BusinessException\(['"`]Visit not found['"`]\)/,
  ]
  requiredActionBlocks.forEach((pattern) => {
    if (pattern.test(serviceContent))
      return
    findings.push({
      file: serviceFile,
      line: 1,
      rule: 'emr-action-missing-record-rejection-required',
      message: 'EMR and visit action endpoints must reject missing or out-of-scope visits instead of silently returning null.',
    })
  })

  if (!existsSync(specPath)) {
    findings.push({
      file: specFile,
      line: 1,
      rule: 'missing-emr-action-missing-record-tests',
      message: 'EMR and visit actions must have regression tests for missing or out-of-scope visit rejection.',
    })
    return
  }

  const specContent = readFileSync(specPath, 'utf8')
  const requiredSpecPatterns = [
    /visit details outside the current area/i,
    /care followup lists outside the current area/i,
    /media batch lists outside the current area/i,
    /locking EMR records outside the current area/i,
    /signing EMR records outside the current area/i,
    /print audit records outside the current area/i,
    /creating care followups outside the current area/i,
    /creating media batches outside the current area/i,
    /creating media files outside the current area/i,
  ]
  requiredSpecPatterns.forEach((pattern) => {
    if (pattern.test(specContent))
      return
    findings.push({
      file: specFile,
      line: 1,
      rule: 'incomplete-emr-action-missing-record-tests',
      message: 'EMR action missing-record tests must cover lock, sign, and print audit rejection.',
    })
  })
}

function auditAiActionMissingRecordBoundaries() {
  const serviceFile = 'src/modules/vpet-ai/ai.service.ts'
  const specFile = 'src/modules/vpet-ai/ai.service.spec.ts'
  const servicePath = join(root, ...serviceFile.split('/'))
  const specPath = join(root, ...specFile.split('/'))
  if (!existsSync(servicePath))
    return

  const serviceContent = readFileSync(servicePath, 'utf8')
  if (!/async reviewPrescription[\s\S]*throw new BusinessException\(['"`]Prescription not found['"`]\)/.test(serviceContent)) {
    findings.push({
      file: serviceFile,
      line: 1,
      rule: 'ai-prescription-review-missing-record-required',
      message: 'AI prescription review must reject missing or out-of-scope prescriptions instead of silently returning null.',
    })
  }

  if (!existsSync(specPath)) {
    findings.push({
      file: specFile,
      line: 1,
      rule: 'missing-ai-action-missing-record-tests',
      message: 'AI action endpoints must have regression tests for missing or out-of-scope business records.',
    })
    return
  }

  const specContent = readFileSync(specPath, 'utf8')
  if (!/prescription reviews outside the current area/i.test(specContent)) {
    findings.push({
      file: specFile,
      line: 1,
      rule: 'incomplete-ai-action-missing-record-tests',
      message: 'AI prescription review tests must cover missing or out-of-scope prescription rejection.',
    })
  }
}

function auditTrustedClientIpResolution() {
  const ipUtilPath = join(root, 'src', 'utils', 'ip.util.ts')
  if (!existsSync(ipUtilPath))
    return

  const content = readFileSync(ipUtilPath, 'utf8')
  const reqIpIndex = content.indexOf('req?.ip')
  const forwardedIndex = content.indexOf('x-forwarded-for')

  if (reqIpIndex < 0) {
    findings.push({
      file: 'src/utils/ip.util.ts',
      line: 1,
      rule: 'missing-trusted-framework-ip',
      message: 'Client IP resolution must use the framework-resolved req.ip so trusted proxy settings are respected.',
    })
  }

  if (forwardedIndex >= 0 && reqIpIndex >= 0 && forwardedIndex < reqIpIndex) {
    findings.push({
      file: 'src/utils/ip.util.ts',
      line: 1,
      rule: 'spoofable-forwarded-header-before-trusted-ip',
      message: 'Do not prefer X-Forwarded-For over req.ip; login throttling and audit logs must not trust spoofable headers directly.',
    })
  }
}

function auditSanitizedExceptionLogging() {
  const exceptionFilterPath = join(root, 'src', 'common', 'filters', 'any-exception.filter.ts')
  if (!existsSync(exceptionFilterPath))
    return

  const lines = readFileSync(exceptionFilterPath, 'utf8').split(/\r?\n/)
  lines.forEach((lineText, index) => {
    if (!/Logger\.error\(\s*exception\b|logger\.error\(\s*exception\b/.test(lineText))
      return
    findings.push({
      file: 'src/common/filters/any-exception.filter.ts',
      line: index + 1,
      rule: 'raw-exception-object-logging',
      message: 'Do not log raw exception objects; log a sanitized message and stack summary only.',
    })
  })
}

function auditExternalHttpTimeouts() {
  for (const absPath of sourceFiles) {
    const relPath = normalizePath(relative(root, absPath))
    const lines = readFileSync(absPath, 'utf8').split(/\r?\n/)
    lines.forEach((lineText, index) => {
      if (!/\b(?:axios|axiosRef)\.get\s*\(/.test(lineText))
        return

      const callPreview = lines.slice(index, Math.min(lines.length, index + 12)).join('\n')
      if (/\btimeout\s*:/.test(callPreview))
        return

      findings.push({
        file: relPath,
        line: index + 1,
        rule: 'external-http-timeout-required',
        message: 'External HTTP calls must set a short timeout so login and business requests cannot hang on third-party services.',
      })
    })
  }
}

function auditCaptchaLogMasking() {
  const servicePath = join(root, 'src', 'modules', 'system', 'log', 'services', 'captcha-log.service.ts')
  if (!existsSync(servicePath))
    return

  const content = readFileSync(servicePath, 'utf8')
  if (!content.includes('maskCaptchaCode')) {
    findings.push({
      file: 'src/modules/system/log/services/captcha-log.service.ts',
      line: 1,
      rule: 'captcha-log-code-mask-required',
      message: 'Captcha audit logs must store masked codes instead of raw verification codes.',
    })
  }

  const lines = content.split(/\r?\n/)
  lines.forEach((lineText, index) => {
    if (!/\bcode\s*,\s*$/.test(lineText) && !/\bcode\s*:\s*code\b/.test(lineText))
      return
    findings.push({
      file: 'src/modules/system/log/services/captcha-log.service.ts',
      line: index + 1,
      rule: 'captcha-log-raw-code-write',
      message: 'Do not save raw verification codes in captcha audit logs.',
    })
  })
}

function auditRefreshTokenCleanupNullSafety() {
  const servicePath = join(root, 'src', 'modules', 'auth', 'services', 'token.service.ts')
  if (!existsSync(servicePath))
    return

  const lines = readFileSync(servicePath, 'utf8').split(/\r?\n/)
  lines.forEach((lineText, index) => {
    if (!/refreshToken\.accessToken\.remove\(\)/.test(lineText))
      return

    const nearby = lines.slice(Math.max(0, index - 8), index + 1).join('\n')
    if (/if\s*\(\s*refreshToken\.accessToken\s*\)/.test(nearby) || /if\s*\(\s*!refreshToken\?\.accessToken/.test(nearby))
      return

    findings.push({
      file: 'src/modules/auth/services/token.service.ts',
      line: index + 1,
      rule: 'refresh-token-cleanup-null-safety',
      message: 'Refresh-token cleanup must check accessToken before dereferencing it so orphaned sessions can still be removed.',
    })
  })
}

function auditProtectedFileResponseHeaders() {
  const controllerPath = join(root, 'src', 'modules', 'tools', 'storage', 'storage.controller.ts')
  if (!existsSync(controllerPath))
    return

  const content = readFileSync(controllerPath, 'utf8')
  const fileStreamCount = (content.match(/createReadStream\(/g) ?? []).length
  const protectedHeaderCount = (content.match(/setProtectedFileResponseHeaders\(/g) ?? []).length
  if (fileStreamCount > 0 && protectedHeaderCount < fileStreamCount) {
    findings.push({
      file: 'src/modules/tools/storage/storage.controller.ts',
      line: 1,
      rule: 'protected-file-response-headers-required',
      message: 'Protected file streaming routes must use setProtectedFileResponseHeaders() for no-store, nosniff, and safe Content-Disposition headers.',
    })
  }

  if (/Cache-Control['"`]\s*,\s*['"`]private,\s*max-age/i.test(content)) {
    findings.push({
      file: 'src/modules/tools/storage/storage.controller.ts',
      line: 1,
      rule: 'protected-file-cache-not-allowed',
      message: 'Protected medical files must not be cached; use no-store response headers.',
    })
  }
}

function auditNetdiskPrivateDownloadTtl() {
  const servicePath = join(root, 'src', 'modules', 'netdisk', 'manager', 'manage.service.ts')
  if (!existsSync(servicePath))
    return

  const lines = readFileSync(servicePath, 'utf8').split(/\r?\n/)
  lines.forEach((lineText, index) => {
    const ttlMatch = lineText.match(/privateDownloadTtlSeconds\s*=\s*(\d+)(?:\s*\*\s*(\d+))?/)
    if (!ttlMatch)
      return

    const ttl = Number(ttlMatch[1]) * Number(ttlMatch[2] ?? 1)
    if (ttl > 10 * 60) {
      findings.push({
        file: 'src/modules/netdisk/manager/manage.service.ts',
        line: index + 1,
        rule: 'netdisk-private-download-ttl-too-long',
        message: 'Private netdisk download links must expire within 10 minutes.',
      })
    }
  })
}

function readPublicRouteAllowlist() {
  const allowlistPath = join(root, 'security', 'public-route-allowlist.json')
  if (!existsSync(allowlistPath)) {
    findings.push({
      file: 'security/public-route-allowlist.json',
      line: 1,
      rule: 'missing-public-route-allowlist',
      message: 'Public and AllowAnon routes must be explicitly documented in security/public-route-allowlist.json.',
    })
    return new Set<string>()
  }

  const parsed = JSON.parse(readFileSync(allowlistPath, 'utf8')) as PublicRouteAllowlist
  const allowlist = new Set<string>()
  parsed.routes.forEach((route, index) => {
    if (!route.method || !route.path || !route.access || !route.reason?.trim()) {
      findings.push({
        file: 'security/public-route-allowlist.json',
        line: index + 1,
        rule: 'public-route-allowlist-incomplete',
        message: 'Each public route allowlist item must include method, path, access, and reason.',
      })
      return
    }
    allowlist.add(routeKey(route))
  })
  return allowlist
}

function readThrottleBypassAllowlist() {
  const allowlistPath = join(root, 'security', 'throttle-bypass-allowlist.json')
  if (!existsSync(allowlistPath)) {
    findings.push({
      file: 'security/throttle-bypass-allowlist.json',
      line: 1,
      rule: 'missing-throttle-bypass-allowlist',
      message: '@SkipThrottle usage must be explicitly documented in security/throttle-bypass-allowlist.json.',
    })
    return new Set<string>()
  }

  const parsed = JSON.parse(readFileSync(allowlistPath, 'utf8')) as ThrottleBypassAllowlist
  const allowlist = new Set<string>()
  parsed.entries.forEach((entry, index) => {
    if (!entry.file || !entry.target || !entry.reason?.trim()) {
      findings.push({
        file: 'security/throttle-bypass-allowlist.json',
        line: index + 1,
        rule: 'throttle-bypass-allowlist-incomplete',
        message: 'Each throttle bypass allowlist item must include file, target, and reason.',
      })
      return
    }
    allowlist.add(throttleBypassKey(entry.file, entry.target))
  })
  return allowlist
}

function readRawSqlAllowlist() {
  const allowlistPath = join(root, 'security', 'raw-sql-allowlist.json')
  if (!existsSync(allowlistPath)) {
    findings.push({
      file: 'security/raw-sql-allowlist.json',
      line: 1,
      rule: 'missing-raw-sql-allowlist',
      message: 'Runtime raw SQL usage must be explicitly documented in security/raw-sql-allowlist.json.',
    })
    return new Set<string>()
  }

  const parsed = JSON.parse(readFileSync(allowlistPath, 'utf8')) as RawSqlAllowlist
  const allowlist = new Set<string>()
  parsed.entries.forEach((entry, index) => {
    if (!entry.file || !entry.target || !entry.reason?.trim()) {
      findings.push({
        file: 'security/raw-sql-allowlist.json',
        line: index + 1,
        rule: 'raw-sql-allowlist-incomplete',
        message: 'Each raw SQL allowlist item must include file, target, and reason.',
      })
      return
    }
    allowlist.add(rawSqlKey(entry.file, entry.target))
  })
  return allowlist
}

function readDataEgressAllowlist() {
  const allowlistPath = join(root, 'security', 'data-egress-allowlist.json')
  if (!existsSync(allowlistPath)) {
    findings.push({
      file: 'security/data-egress-allowlist.json',
      line: 1,
      rule: 'missing-data-egress-allowlist',
      message: 'Routes that return files, download links, exports, or printable data packages must be documented in security/data-egress-allowlist.json.',
    })
    return new Set<string>()
  }

  const parsed = JSON.parse(readFileSync(allowlistPath, 'utf8')) as DataEgressAllowlist
  const allowlist = new Set<string>()
  parsed.routes.forEach((route, index) => {
    if (!route.method || !route.path || !route.target || !route.reason?.trim()) {
      findings.push({
        file: 'security/data-egress-allowlist.json',
        line: index + 1,
        rule: 'data-egress-allowlist-incomplete',
        message: 'Each data egress allowlist item must include method, path, target, and reason.',
      })
      return
    }
    allowlist.add(dataEgressKey(route))
  })
  return allowlist
}

function auditRawSqlUsage(absPath: string, lines: string[]) {
  const relPath = normalizePath(relative(root, absPath))
  if (relPath.startsWith('src/migrations/'))
    return

  lines.forEach((lineText, index) => {
    if (!/\.query\s*\(/.test(lineText))
      return

    const target = resolveEnclosingClassMethod(lines, index)
    const key = rawSqlKey(relPath, target)
    rawSqlSeen.add(key)
    if (!rawSqlAllowlist.has(key)) {
      findings.push({
        file: relPath,
        line: index + 1,
        rule: 'raw-sql-not-allowlisted',
        message: `Runtime raw SQL in ${target} must be documented in security/raw-sql-allowlist.json and explain tenant/area isolation.`,
      })
    }
  })
}

function auditDataEgressRoutes(absPath: string, lines: string[]) {
  const controllerLine = lines.findIndex(line => /^\s*@Controller\b/.test(line))
  const classLine = lines.findIndex(line => /^\s*export\s+class\s+/.test(line))
  if (controllerLine < 0 || classLine < 0)
    return

  const controllerPath = readDecoratorPath(lines[controllerLine])
  const controllerName = lines[classLine].match(/export\s+class\s+(\w+)/)?.[1] ?? 'UnknownController'
  for (let i = classLine + 1; i < lines.length; i += 1) {
    const route = readRouteDecoratorForAudit(lines[i])
    if (!route)
      continue

    const methodLine = findNextControllerMethodLine(lines, i + 1)
    if (methodLine < 0)
      continue

    const handler = lines[methodLine].match(/\b(?:async\s+)?(\w+)\s*\(/)?.[1] ?? 'anonymous'
    const nextRouteLine = findNextRouteDecoratorLine(lines, methodLine + 1)
    const bodyPreview = lines.slice(methodLine, nextRouteLine < 0 ? lines.length : nextRouteLine).join('\n')
    if (!isDataEgressRoute(route.path, handler, bodyPreview))
      continue

    const routeInfo = {
      method: route.method,
      path: joinAuditApiPath(controllerPath, route.path),
      target: `${controllerName}.${handler}`,
    }
    const key = dataEgressKey(routeInfo)
    dataEgressSeen.add(key)
    if (!dataEgressAllowlist.has(key)) {
      findings.push({
        file: relative(root, absPath),
        line: i + 1,
        rule: 'data-egress-route-not-allowlisted',
        message: `Data egress route ${routeInfo.method} ${routeInfo.path} (${routeInfo.target}) must be documented in security/data-egress-allowlist.json with its permission and isolation reason.`,
      })
    }
  }
}

function auditDataEgressAllowlistStale() {
  for (const key of dataEgressAllowlist.keys()) {
    if (dataEgressSeen.has(key))
      continue
    findings.push({
      file: 'security/data-egress-allowlist.json',
      line: 1,
      rule: 'data-egress-allowlist-stale',
      message: `Allowlisted data egress route is not present in controller source: ${key}.`,
    })
  }
}

function auditRawSqlAllowlistStale() {
  for (const key of rawSqlAllowlist.keys()) {
    if (rawSqlSeen.has(key))
      continue
    findings.push({
      file: 'security/raw-sql-allowlist.json',
      line: 1,
      rule: 'raw-sql-allowlist-stale',
      message: `Allowlisted raw SQL target is not present in runtime source: ${key}.`,
    })
  }
}

function isDataEgressRoute(routePath: string, handler: string, bodyPreview: string) {
  if (/download|export|print/i.test(`${routePath} ${handler}`))
    return true
  if (/file.*refresh|refresh.*token/i.test(`${routePath} ${handler}`))
    return true
  return /\b(?:createReadStream|getDownloadLink|Content-Disposition)\b/.test(bodyPreview)
}

function readRouteDecoratorForAudit(lineText: string) {
  const match = lineText.trim().match(/^@(Get|Post|Put|Patch|Delete|Sse)\b(?:\((.*)\))?/)
  if (!match)
    return null
  return {
    method: match[1].toUpperCase() === 'SSE' ? 'SSE' : match[1].toUpperCase(),
    path: readDecoratorPath(lineText),
  }
}

function readDecoratorPath(lineText: string) {
  return lineText.match(/\(\s*['"`]([^'"`]*)['"`]/)?.[1] ?? ''
}

function findNextControllerMethodLine(lines: string[], start: number) {
  for (let i = start; i < Math.min(lines.length, start + 16); i += 1) {
    if (/^\s*(?:async\s+)?\w+\s*\(/.test(lines[i]))
      return i
  }
  return -1
}

function findNextRouteDecoratorLine(lines: string[], start: number) {
  for (let i = start; i < lines.length; i += 1) {
    if (readRouteDecoratorForAudit(lines[i]))
      return i
  }
  return -1
}

function joinAuditApiPath(controllerPath: string, routePath: string) {
  return `/${[controllerPath, routePath].filter(Boolean).join('/')}`.replace(/\/+/g, '/')
}

function dataEgressKey(route: { method: string, path: string, target: string }) {
  return `${route.method.toUpperCase()} ${route.path}#${route.target}`
}

function auditThrottleBypass(absPath: string, lines: string[]) {
  lines.forEach((lineText, index) => {
    if (!lineText.includes('@SkipThrottle'))
      return

    const relPath = normalizePath(relative(root, absPath))
    const target = resolveDecoratorTarget(lines, index)
    const key = throttleBypassKey(relPath, target)
    if (!throttleBypassAllowlist.has(key)) {
      findings.push({
        file: relPath,
        line: index + 1,
        rule: 'skip-throttle-not-allowlisted',
        message: `@SkipThrottle bypass for ${target} must be documented in security/throttle-bypass-allowlist.json with a business reason.`,
      })
    }
  })
}

function resolveEnclosingClassMethod(lines: string[], lineIndex: number) {
  let className = 'module'
  let methodName = `line:${lineIndex + 1}`

  for (let i = 0; i <= lineIndex; i += 1) {
    const lineText = lines[i].trim()
    const classMatch = lineText.match(/^export\s+class\s+(\w+)/)
    if (classMatch)
      className = classMatch[1]

    const methodMatch = lineText.match(/^(?:async\s+|private\s+|public\s+|protected\s+)*(\w+)\s*\([^)]*\)\s*(?::[^{]+)?\s*\{?\s*$/)
    if (methodMatch && !['if', 'for', 'while', 'switch', 'catch', 'constructor'].includes(methodMatch[1]))
      methodName = methodMatch[1]
  }

  return `${className}.${methodName}`
}

function rawSqlKey(file: string, target: string) {
  return `${normalizePath(file)}#${target}`
}

function resolveDecoratorTarget(lines: string[], decoratorIndex: number) {
  for (let i = decoratorIndex + 1; i < Math.min(lines.length, decoratorIndex + 12); i += 1) {
    const lineText = lines[i].trim()
    const classMatch = lineText.match(/^export\s+class\s+(\w+)/)
    if (classMatch)
      return classMatch[1]

    const methodMatch = lineText.match(/^(?:async\s+)?(\w+)\s*\(/)
    if (methodMatch)
      return methodMatch[1]
  }
  return `line:${decoratorIndex + 1}`
}

function throttleBypassKey(file: string, target: string) {
  return `${normalizePath(file)}#${target}`
}

function normalizePath(path: string) {
  return path.replace(/\\/g, '/')
}

function parsePublicRouteMatrixLine(lineText: string) {
  const match = lineText.match(/^\|[^|]+\|\s*([^|]+)\|\s*`([^`]+)`\s*\|\s*`(AllowAnon|Public)`\s*\|/)
  if (!match)
    return null
  return {
    method: match[1].trim(),
    path: match[2].trim(),
    access: match[3].trim() as 'AllowAnon' | 'Public',
  }
}

function routeKey(route: { method: string, path: string, access: string }) {
  return `${route.access} ${route.method.toUpperCase()} ${route.path}`
}

function auditVpetScopedRepositoryAccess(absPath: string, lines: string[]) {
  if (!absPath.includes(`${join('src', 'modules', 'vpet-')}`) || !absPath.endsWith('.service.ts'))
    return

  const highRiskPatterns = [
    {
      pattern: /\.\w*Repository\.findOneBy\(\{\s*id\s*\}\)/,
      message: 'VPet repository lookups by id must include tenantId and areaId or a documented tenant-only scope.',
    },
    {
      pattern: /\.\w*Repository\.update\(\s*id\s*,/,
      message: 'VPet repository updates by id must use scoped criteria with tenantId and areaId.',
    },
    {
      pattern: /\.\w*Repository\.delete\(\s*id\s*\)/,
      message: 'VPet repository deletes by id must use scoped criteria with tenantId and areaId.',
    },
  ]

  lines.forEach((lineText, index) => {
    for (const { pattern, message } of highRiskPatterns) {
      if (!pattern.test(lineText))
        continue
      findings.push({
        file: relative(root, absPath),
        line: index + 1,
        rule: 'vpet-no-unscoped-id-repository-access',
        message,
      })
    }
  })
}

function auditVpetScopedQueryBuilderWhereOverride(absPath: string, lines: string[]) {
  if (!absPath.includes(`${join('src', 'modules', 'vpet-')}`) || !absPath.endsWith('.service.ts'))
    return

  const scopedQueryBuilders = new Set<string>()
  let activeQueryBuilder: string | null = null

  lines.forEach((lineText, index) => {
    const declaration = lineText.match(/\bconst\s+(\w+)\s*=\s*.*\.createQueryBuilder\(/)
    if (declaration)
      activeQueryBuilder = declaration[1]

    if (activeQueryBuilder && /\.andWhere\([^)]*\b(?:tenantId|areaId)\b/.test(lineText))
      scopedQueryBuilders.add(activeQueryBuilder)

    const whereCall = lineText.match(/^\s*(\w+)\.where\(/)
    if (whereCall && scopedQueryBuilders.has(whereCall[1])) {
      findings.push({
        file: relative(root, absPath),
        line: index + 1,
        rule: 'vpet-no-scoped-querybuilder-where-override',
        message: 'Do not call where() after tenantId/areaId scope has been added with andWhere(); where() overwrites previous QueryBuilder predicates.',
      })
    }

    if (activeQueryBuilder && /;\s*$/.test(lineText))
      activeQueryBuilder = null
  })
}

function auditCommentSwallowedCode(absPath: string, lineText: string, line: number) {
  const commentBody = lineText.replace(/^\s*\/\//, '')
  const hasNonAsciiText = [...commentBody].some(char => char.charCodeAt(0) > 127)
  if (!hasNonAsciiText)
    return
  if (!/\S.{8,}\s{2,}(?:if|for|while|return|throw|await|const|let|var)\s/.test(commentBody))
    return
  findings.push({
    file: relative(root, absPath),
    line,
    rule: 'comment-swallowed-code',
    message: 'Suspicious code-like tokens appear after a line comment; check for mojibake/comment swallowing executable code.',
  })
}

function auditControllerAccessMetadata(absPath: string, lines: string[]) {
  const classLine = lines.findIndex(line => /^\s*export\s+class\s+/.test(line))
  const controllerLine = lines.findIndex(line => /^\s*@Controller\b/.test(line))
  if (classLine < 0 || controllerLine < 0)
    return

  const classDecorators = lines
    .slice(Math.max(0, controllerLine - 12), classLine)
    .filter(line => /^\s*@/.test(line))
    .join('\n')
  const classHasAccessMetadata = hasAccessMetadataDecorator(classDecorators)

  lines.forEach((lineText, index) => {
    if (!hasRouteDecorator(lineText))
      return
    if (classHasAccessMetadata)
      return

    const methodDecorators = lines
      .slice(Math.max(0, index - 12), Math.min(lines.length, index + 8))
      .filter(line => /^\s*@/.test(line))
      .join('\n')
    if (hasAccessMetadataDecorator(methodDecorators))
      return

    findings.push({
      file: relative(root, absPath),
      line: index + 1,
      rule: 'controller-access-metadata',
      message: 'Controller route handlers must declare @Perm, @AllowAnon, @Public, or inherit class-level access metadata.',
    })
  })
}

function hasAccessMetadataDecorator(text: string) {
  return ['@Perm', '@AllowAnon', '@Public'].some(decorator => text.includes(decorator))
}

function hasRouteDecorator(text: string) {
  const trimmed = text.trimStart()
  return ['@Get', '@Post', '@Put', '@Patch', '@Delete', '@Sse'].some(decorator => trimmed.startsWith(decorator))
}

function listSourceFiles(dir: string): string[] {
  const result: string[] = []
  for (const entry of readdirSync(dir)) {
    const absPath = join(dir, entry)
    const stat = statSync(absPath)
    if (stat.isDirectory()) {
      if (absPath.includes(`${join('src', 'api', 'backend')}`))
        continue
      result.push(...listSourceFiles(absPath))
      continue
    }
    if (/\.(?:ts|tsx|vue)$/.test(entry) && !entry.endsWith('.spec.ts'))
      result.push(absPath)
  }
  return result
}

if (findings.length) {
  console.error('Security audit failed:')
  findings.forEach((finding) => {
    console.error(`${finding.file}:${finding.line} [${finding.rule}] ${finding.message}`)
  })
  process.exit(1)
}

console.log('Security audit passed.')
