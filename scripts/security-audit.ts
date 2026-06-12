import { readdirSync, readFileSync, statSync } from 'node:fs'
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
  lines.forEach((lineText, index) => {
    if (lineText.trim().startsWith('//'))
      return
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
