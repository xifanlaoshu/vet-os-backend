import { BadRequestException } from '@nestjs/common'
import { saveLocalFile } from '~/utils/file.util'
import { UploadService } from './upload.service'

jest.mock('~/utils/file.util', () => ({
  fileRename: jest.fn(() => 'file-20260613000000000.png'),
  getExtname: jest.fn(() => 'png'),
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
    saveLocalFileMock.mockImplementation(async () => {
      writes.push('file')
    })
    const repository = {
      save: jest.fn(async (payload) => {
        writes.push('metadata')
        return { ...payload, id: 10 }
      }),
    }
    const service = new UploadService(repository as any)

    await expect(service.saveFile({
      filename: 'file.png',
      mimetype: 'image/png',
      toBuffer: jest.fn(async () => Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])),
    } as any, { uid: 9, tenantId: 2, areaId: 3 } as any)).resolves.toMatchObject({
      id: 10,
      path: expect.stringMatching(/^\/api\/storage\/file\//),
      tokenExpiresAt: expect.any(Date),
    })

    expect(writes).toEqual(['file', 'metadata'])
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 2,
      areaId: 3,
      scanStatus: 2,
      tokenExpiresAt: expect.any(Date),
    }))
  })

  it('rejects files whose content does not match the declared type', async () => {
    const service = new UploadService({ save: jest.fn() } as any)

    await expect(service.saveFile({
      filename: 'file.png',
      mimetype: 'image/png',
      toBuffer: jest.fn(async () => Buffer.from('not-a-png')),
    } as any, { uid: 9, tenantId: 2, areaId: 3 } as any)).rejects.toBeInstanceOf(BadRequestException)
  })
})
