import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { cwd } from 'node:process'

interface Finding {
  file: string
  line: number
  rule: string
  message: string
}

const root = cwd()
const sourceFiles = listSourceFiles(join(root, 'src'))

const findings: Finding[] = []

auditProductionEnvFile()
auditPermissionMatrix()

const rules = [
  {
    rule: 'no-console-log',
    pattern: /\bconsole\.log\s*\(/,
    message: 'Do not use console.log in backend code; use Logger with sanitized messages.',
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
]

for (const file of sourceFiles) {
  const absPath = file
  const content = readFileSync(absPath, 'utf8')
  const lines = content.split(/\r?\n/)
  auditControllerAccessMetadata(absPath, lines)
  auditVpetScopedRepositoryAccess(absPath, lines)
  lines.forEach((lineText, index) => {
    if (lineText.trim().startsWith('//'))
      return auditCommentSwallowedCode(absPath, lineText, index + 1)
    for (const { rule, pattern, message } of rules) {
      if (!pattern.test(lineText))
        continue
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
  lines.forEach((lineText, index) => {
    if (!lineText.includes('`MISSING`'))
      return
    findings.push({
      file: 'security/api-permission-matrix.md',
      line: index + 1,
      rule: 'api-permission-matrix-missing-access',
      message: 'API permission matrix contains a route with missing access metadata.',
    })
  })
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
  if (!absPath.endsWith('.controller.ts'))
    return

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
