import { BadRequestException } from '@nestjs/common'
import { saveLocalFile } from '~/utils/file.util'
import { UploadService } from './upload.service'

jest.mock('sharp', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    rotate: jest.fn().mockReturnThis(),
    resize: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    toBuffer: jest.fn(async () => Buffer.from('thumbnail')),
  })),
}))

jest.mock('~/utils/file.util', () => ({
  fileRename: jest.fn(() => 'file-20260613000000000.png'),
  getExtname: jest.fn((fileName: string) => String(fileName).split('.').pop() || ''),
  getFileType: jest.fn(() => 'image'),
  getProtectedUploadPath: jest.fn(() => 'tenant/2/area/3/2026-06-13/image/file-20260613000000000.png'),
  getSize: jest.fn(() => '8 B'),
  saveLocalFile: jest.fn(),
}))

describe('uploadService file safety', () => {
  const saveLocalFileMock = saveLocalFile as jest.MockedFunction<typeof saveLocalFile>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('waits for protected local file persistence before saving storage metadata', async () => {
    const writes: string[] = []
    saveLocalFileMock.mockImplementation(async (_buffer, name) => {
      writes.push(String(name).includes('-thumb.') ? 'thumbnail-file' : 'file')
    })
    let nextId = 10
    const repository = {
      save: jest.fn(async (payload) => {
        writes.push(payload.bizType === 'vpet_media_thumbnail' ? 'thumbnail-metadata' : 'metadata')
        return { ...payload, id: nextId++ }
      }),
    }
    const service = new UploadService(repository as any)

    await expect(service.saveFile({
      filename: 'file.png',
      mimetype: 'image/png',
      toBuffer: jest.fn(async () => Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])),
    } as any, { uid: 9, tenantId: 2, areaId: 3 } as any)).resolves.toMatchObject({
      id: 10,
      path: expect.stringMatching(/^\/api\/tools\/storage\/file\//),
      tokenExpiresAt: expect.any(Date),
      thumbnail: {
        id: 11,
        path: expect.stringMatching(/^\/api\/tools\/storage\/file\//),
        tokenExpiresAt: expect.any(Date),
      },
    })

    expect(writes).toEqual(['file', 'metadata', 'thumbnail-file', 'thumbnail-metadata'])
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 2,
      areaId: 3,
      scanStatus: 2,
      tokenExpiresAt: expect.any(Date),
    }))
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 2,
      areaId: 3,
      extName: 'webp',
      bizType: 'vpet_media_thumbnail',
      bizId: 10,
      scanStatus: 2,
    }))
    const savedPayload = repository.save.mock.calls[0][0]
    expect(savedPayload.tokenExpiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 10 * 60 * 1000)
  })

  it('rejects files whose content does not match the declared type', async () => {
    const service = new UploadService({ save: jest.fn() } as any)

    await expect(service.saveFile({
      filename: 'file.png',
      mimetype: 'image/png',
      toBuffer: jest.fn(async () => Buffer.from('not-a-png')),
    } as any, { uid: 9, tenantId: 2, areaId: 3 } as any)).rejects.toBeInstanceOf(BadRequestException)
  })

  it('rejects uncommon image formats before persisting files', async () => {
    const repository = { save: jest.fn() }
    const service = new UploadService(repository as any)

    await expect(service.saveFile({
      filename: 'file.heic',
      mimetype: 'image/heic',
      toBuffer: jest.fn(async () => Buffer.from('heic')),
    } as any, { uid: 9, tenantId: 2, areaId: 3 } as any)).rejects.toBeInstanceOf(BadRequestException)

    await expect(service.saveFile({
      filename: 'file.svg',
      mimetype: 'image/svg+xml',
      toBuffer: jest.fn(async () => Buffer.from('<svg />')),
    } as any, { uid: 9, tenantId: 2, areaId: 3 } as any)).rejects.toBeInstanceOf(BadRequestException)

    expect(saveLocalFileMock).not.toHaveBeenCalled()
    expect(repository.save).not.toHaveBeenCalled()
  })
})
