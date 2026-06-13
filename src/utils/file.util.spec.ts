import path from 'node:path'

import {
  getFilePath,
  getProtectedUploadPath,
  getProtectedUploadRoot,
  getPublicUploadRoot,
  resolveProtectedUploadPath,
} from './file.util'

describe('protected upload path configuration', () => {
  const originalProtectedUploadRoot = process.env.PROTECTED_UPLOAD_ROOT
  const originalPublicUploadRoot = process.env.PUBLIC_UPLOAD_ROOT
  const originalPublicUploadUrlPrefix = process.env.PUBLIC_UPLOAD_URL_PREFIX

  afterEach(() => {
    if (originalProtectedUploadRoot === undefined)
      delete process.env.PROTECTED_UPLOAD_ROOT
    else
      process.env.PROTECTED_UPLOAD_ROOT = originalProtectedUploadRoot
    if (originalPublicUploadRoot === undefined)
      delete process.env.PUBLIC_UPLOAD_ROOT
    else
      process.env.PUBLIC_UPLOAD_ROOT = originalPublicUploadRoot
    if (originalPublicUploadUrlPrefix === undefined)
      delete process.env.PUBLIC_UPLOAD_URL_PREFIX
    else
      process.env.PUBLIC_UPLOAD_URL_PREFIX = originalPublicUploadUrlPrefix
  })

  it('defaults protected uploads to the workspace protected-upload directory', () => {
    delete process.env.PROTECTED_UPLOAD_ROOT

    expect(getProtectedUploadRoot()).toBe(path.resolve(process.cwd(), 'protected-upload'))
  })

  it('resolves configured protected upload roots from environment variables', () => {
    process.env.PROTECTED_UPLOAD_ROOT = 'runtime-data/protected-upload'

    expect(getProtectedUploadRoot()).toBe(path.resolve(process.cwd(), 'runtime-data/protected-upload'))
  })

  it('resolves public upload roots from environment variables for legacy public uploads', () => {
    delete process.env.PUBLIC_UPLOAD_ROOT
    expect(getPublicUploadRoot()).toBe(path.resolve(process.cwd(), 'public/upload'))

    process.env.PUBLIC_UPLOAD_ROOT = 'runtime-data/public-upload'
    expect(getPublicUploadRoot()).toBe(path.resolve(process.cwd(), 'runtime-data/public-upload'))
  })

  it('uses a configurable public upload URL prefix for legacy public upload links', () => {
    delete process.env.PUBLIC_UPLOAD_URL_PREFIX
    expect(getFilePath('file.png', '2026-06-13', 'image')).toBe('/upload/2026-06-13/image/file.png')

    process.env.PUBLIC_UPLOAD_URL_PREFIX = '/assets/upload/'
    expect(getFilePath('file.png', '2026-06-13', 'image')).toBe('/assets/upload/2026-06-13/image/file.png')
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
