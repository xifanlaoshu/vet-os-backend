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
auditPermissionMatrix()
auditTenantContextGuard()
auditStorageTokenExpiration()
auditTrustedClientIpResolution()
auditSanitizedExceptionLogging()
auditExternalHttpTimeouts()

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

  if (!/tokenExpiresAt[\s\S]{0,120}Date\.now\(\)/.test(storageService)) {
    findings.push({
      file: 'src/modules/tools/storage/storage.service.ts',
      line: 1,
      rule: 'missing-storage-token-expiration-check',
      message: 'Anonymous storage token access must reject expired links.',
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
