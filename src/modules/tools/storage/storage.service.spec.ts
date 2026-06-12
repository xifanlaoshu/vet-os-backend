import { stat } from 'node:fs/promises'

import { BadRequestException } from '@nestjs/common'

import { StorageService } from './storage.service'

jest.mock('node:fs/promises', () => ({
  stat: jest.fn(),
}))

jest.mock('~/utils', () => ({
  deleteFile: jest.fn(),
  resolveProtectedUploadPath: (path: string) => `D:/protected/${path}`,
}))

describe('storageService security boundaries', () => {
  const statMock = stat as jest.MockedFunction<typeof stat>

  function createService(repository: any) {
    return new StorageService(repository, {} as any)
  }

  beforeEach(() => {
    jest.clearAllMocks()
    statMock.mockResolvedValue({ isFile: () => true } as any)
  })

  it('loads files by id only within the current tenant and area', async () => {
    const repository = {
      findOneBy: jest.fn().mockResolvedValue({
        id: 10,
        tenantId: 2,
        areaId: 3,
        scanStatus: 2,
        diskPath: 'tenant/2/area/3/file.png',
        extName: 'png',
        fileName: 'file.png',
        name: 'file.png',
      }),
    }
    const service = createService(repository)

    await service.getAuthorizedFileById(10, { tenantId: 2, areaId: 3 })

    expect(repository.findOneBy).toHaveBeenCalledWith({
      id: 10,
      tenantId: 2,
      areaId: 3,
      scanStatus: 2,
    })
  })

  it('rejects missing or cross-area files', async () => {
    const repository = {
      findOneBy: jest.fn().mockResolvedValue(null),
    }
    const service = createService(repository)

    await expect(service.getAuthorizedFileById(10, { tenantId: 2, areaId: 99 })).rejects.toBeInstanceOf(BadRequestException)
  })

  it('rejects expired anonymous file tokens', async () => {
    const repository = {
      findOneBy: jest.fn().mockResolvedValue({
        id: 10,
        scanStatus: 2,
        tokenExpiresAt: new Date(Date.now() - 1000),
        diskPath: 'tenant/2/area/3/file.png',
        extName: 'png',
        fileName: 'file.png',
        name: 'file.png',
      }),
    }
    const service = createService(repository)

    await expect(service.getAuthorizedFileByToken('expired-token')).rejects.toBeInstanceOf(BadRequestException)
  })

  it('keeps legacy anonymous tokens without expiration readable', async () => {
    const repository = {
      findOneBy: jest.fn().mockResolvedValue({
        id: 10,
        scanStatus: 2,
        tokenExpiresAt: null,
        diskPath: 'tenant/2/area/3/file.png',
        extName: 'png',
        fileName: 'file.png',
        name: 'file.png',
      }),
    }
    const service = createService(repository)

    await expect(service.getAuthorizedFileByToken('legacy-token')).resolves.toMatchObject({
      filePath: 'D:/protected/tenant/2/area/3/file.png',
      mimeType: 'image/png',
    })
  })

  it('refreshes anonymous file tokens only within the current tenant and area', async () => {
    const save = jest.fn(async item => item)
    const repository = {
      findOneBy: jest.fn().mockResolvedValue({
        id: 10,
        tenantId: 2,
        areaId: 3,
        scanStatus: 2,
        accessToken: 'old-token',
        path: '/api/storage/file/old-token',
        diskPath: 'tenant/2/area/3/file.png',
        extName: 'png',
        fileName: 'file.png',
        name: 'file.png',
      }),
      save,
    }
    const service = createService(repository)

    const result = await service.refreshAnonymousToken('old-token', { tenantId: 2, areaId: 3 })

    expect(repository.findOneBy).toHaveBeenCalledWith({
      accessToken: 'old-token',
      tenantId: 2,
      areaId: 3,
      scanStatus: 2,
    })
    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      id: 10,
      accessToken: expect.not.stringMatching(/^old-token$/),
      path: expect.stringMatching(/^\/api\/storage\/file\//),
      tokenExpiresAt: expect.any(Date),
    }))
    expect(result).toMatchObject({
      id: 10,
      path: expect.stringMatching(/^\/api\/storage\/file\//),
    })
  })
})
