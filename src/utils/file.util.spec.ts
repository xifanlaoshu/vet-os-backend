import path from 'node:path'

import {
  getProtectedUploadPath,
  getProtectedUploadRoot,
  resolveProtectedUploadPath,
} from './file.util'

describe('protected upload path configuration', () => {
  const originalProtectedUploadRoot = process.env.PROTECTED_UPLOAD_ROOT

  afterEach(() => {
    if (originalProtectedUploadRoot === undefined)
      delete process.env.PROTECTED_UPLOAD_ROOT
    else
      process.env.PROTECTED_UPLOAD_ROOT = originalProtectedUploadRoot
  })

  it('defaults protected uploads to the workspace protected-upload directory', () => {
    delete process.env.PROTECTED_UPLOAD_ROOT

    expect(getProtectedUploadRoot()).toBe(path.resolve(process.cwd(), 'protected-upload'))
  })

  it('resolves configured protected upload roots from environment variables', () => {
    process.env.PROTECTED_UPLOAD_ROOT = 'runtime-data/protected-upload'

    expect(getProtectedUploadRoot()).toBe(path.resolve(process.cwd(), 'runtime-data/protected-upload'))
  })

  it('stores tenant-area disk paths in portable POSIX format', () => {
    expect(getProtectedUploadPath(2, 3, 'file.png', '2026-06-13', 'image'))
      .toBe('tenant/2/area/3/2026-06-13/image/file.png')
  })

  it('resolves protected files under the configured root and rejects traversal', () => {
    process.env.PROTECTED_UPLOAD_ROOT = 'runtime-data/protected-upload'

    expect(resolveProtectedUploadPath('tenant/2/area/3/file.png'))
      .toBe(path.resolve(process.cwd(), 'runtime-data/protected-upload/tenant/2/area/3/file.png'))
    expect(resolveProtectedUploadPath('tenant\\2\\area\\3\\file.png'))
      .toBe(path.resolve(process.cwd(), 'runtime-data/protected-upload/tenant/2/area/3/file.png'))
    expect(() => resolveProtectedUploadPath('../secret.txt')).toThrow(/Invalid protected file path/)
  })
})
