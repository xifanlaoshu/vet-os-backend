import { readFileSync } from 'node:fs'
import { join } from 'node:path'

interface DataEgressRoute {
  method: string
  path: string
  target: string
  egressType: string
  sensitivity: string
  permission: string
  isolation: string
  audit: string
  watermark: string
  reason: string
}

function readAllowlist(): DataEgressRoute[] {
  const content = readFileSync(join(process.cwd(), 'security', 'data-egress-allowlist.json'), 'utf8')
  return JSON.parse(content).routes
}

function readControllerSource(target: string) {
  const [controllerName] = target.split('.')
  const candidates: Record<string, string> = {
    NetDiskManageController: 'src/modules/netdisk/manager/manage.controller.ts',
    StorageController: 'src/modules/tools/storage/storage.controller.ts',
    VisitController: 'src/modules/vpet-visit/visit.controller.ts',
  }
  const relativePath = candidates[controllerName]
  if (!relativePath)
    throw new Error(`Missing test source mapping for ${target}`)
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

describe('data egress governance allowlist', () => {
  it('documents permission, isolation, audit, and watermark policy for every egress route', () => {
    const routes = readAllowlist()

    expect(routes.length).toBeGreaterThan(0)
    routes.forEach((route) => {
      expect(route).toEqual(expect.objectContaining({
        method: expect.any(String),
        path: expect.any(String),
        target: expect.any(String),
        egressType: expect.stringMatching(/^(download-link|file-stream|print-audit|export|preview-token|other)$/),
        sensitivity: expect.stringMatching(/^(internal|personal|medical|financial|system)$/),
        permission: expect.stringMatching(/(?:Perm|AllowAnon|opaque token|token)/i),
        isolation: expect.stringMatching(/(?:tenant|area|院区|租户|token|scoped|scope)/i),
        audit: expect.stringMatching(/(?:audit|log|审计|记录|allowlist|no-store|preview token)/i),
        watermark: expect.stringMatching(/(?:watermark|水印|not applicable|N\/A|audit-only|inline preview|binary)/i),
        reason: expect.any(String),
      }))
      expect(route.reason.trim()).not.toHaveLength(0)
    })
  })

  it('keeps declared egress permission models aligned with controller decorators', () => {
    readAllowlist().forEach((route) => {
      const source = readControllerSource(route.target)

      if (/@Perm/i.test(route.permission))
        expect(source).toContain('@Perm(')
      if (/AllowAnon/i.test(route.permission))
        expect(source).toContain('@AllowAnon()')
    })
  })
})
