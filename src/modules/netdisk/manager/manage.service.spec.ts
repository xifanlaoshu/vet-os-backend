import { BadRequestException } from '@nestjs/common'

import { NetDiskManageService } from './manage.service'

const context = { tenantId: 2, areaId: 3 } as any

function createService(bucketManager: any = {}) {
  const service = new NetDiskManageService(
    {
      accessKey: 'ak',
      secretKey: 'sk',
      bucket: 'bucket',
      domain: 'https://cdn.example.com',
      access: 'private',
      zone: undefined,
    } as any,
    {
      getAccountInfo: jest.fn(),
    } as any,
  )
  ;(service as any).bucketManager = bucketManager
  return service
}

describe('netDiskManageService tenant area isolation', () => {
  it('builds all object keys under the current tenant area netdisk prefix', () => {
    const service = createService()

    expect(service.getTenantAreaPrefix(context)).toBe('tenants/2/areas/3/netdisk/')
    expect(service.buildScopedKey('/records/cat.jpg', context)).toBe('tenants/2/areas/3/netdisk/records/cat.jpg')
  })

  it('rejects path traversal before touching OSS', () => {
    const service = createService()

    expect(() => service.buildScopedKey('../other-area/file.txt', context)).toThrow(BadRequestException)
    expect(() => service.buildScopedKey('records/../../file.txt', context)).toThrow(BadRequestException)
  })

  it('lists and searches only within the current tenant area prefix', async () => {
    const listPrefix = jest.fn((_bucket, _options, callback) => {
      callback(null, {
        commonPrefixes: ['tenants/2/areas/3/netdisk/reports/'],
        items: [
          {
            key: 'tenants/2/areas/3/netdisk/reports/a.pdf',
            fsize: 10,
            mimeType: 'application/pdf',
            putTime: '17180000000000',
          },
        ],
        marker: '',
      }, { statusCode: 200 })
    })
    const service = createService({ listPrefix })

    const page = await service.getFileList('', '', '', context)
    expect(listPrefix).toHaveBeenCalledWith('bucket', expect.objectContaining({
      prefix: 'tenants/2/areas/3/netdisk/',
      delimiter: '/',
    }), expect.any(Function))
    expect(page.list).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'reports', type: 'dir' }),
      expect.objectContaining({ name: 'reports/a.pdf', type: 'file' }),
    ]))

    await service.getFileList('', '', 'a', context)
    expect(listPrefix).toHaveBeenLastCalledWith('bucket', expect.objectContaining({
      prefix: 'tenants/2/areas/3/netdisk/',
      delimiter: '',
    }), expect.any(Function))
  })

  it('scopes download and batch operations to the current tenant area', async () => {
    const stat = jest.fn((_bucket, key, callback) => callback(null, {}, { statusCode: 612 }))
    const batch = jest.fn((_operations, callback) => callback(null, {}, { statusCode: 200 }))
    const service = createService({ stat, batch })

    await expect(service.checkFileExist(service.buildScopedKey('rx/cat.pdf', context))).resolves.toBe(false)
    await service.deleteMultiFileOrDir([{ type: 'file', name: 'cat.pdf' }], 'rx/', context)

    expect(stat).toHaveBeenCalledWith('bucket', 'tenants/2/areas/3/netdisk/rx/cat.pdf', expect.any(Function))
    expect(batch).toHaveBeenCalled()
  })
})
