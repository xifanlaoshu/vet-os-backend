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
})
