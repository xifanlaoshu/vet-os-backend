import fs from 'node:fs'
import path from 'node:path'

import { MultipartFile } from '@fastify/multipart'

import dayjs from 'dayjs'

import { cwd, env } from '~/global/env'

enum Type {
  IMAGE = '图片',
  TXT = '文档',
  MUSIC = '音乐',
  VIDEO = '视频',
  OTHER = '其他',
}

export function getFileType(extName: string) {
  const documents = 'txt doc pdf ppt pps xlsx xls docx'
  const music = 'mp3 wav wma mpa ram ra aac aif m4a'
  const video = 'avi mpg mpe mpeg asf wmv mov qt rm mp4 flv m4v webm ogv ogg'
  const image
    = 'bmp dib pcp dif wmf gif jpg tif eps psd cdr iff tga pcd mpt png jpeg webp'
  if (image.includes(extName))
    return Type.IMAGE

  if (documents.includes(extName))
    return Type.TXT

  if (music.includes(extName))
    return Type.MUSIC

  if (video.includes(extName))
    return Type.VIDEO

  return Type.OTHER
}

export function getName(fileName: string) {
  if (fileName.includes('.'))
    return fileName.split('.')[0]

  return fileName
}

export function getExtname(fileName: string) {
  return path.extname(fileName).replace('.', '')
}

export function getSize(bytes: number, decimals = 2) {
  if (bytes === 0)
    return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${Number.parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`
}

export function fileRename(fileName: string) {
  const name = fileName.split('.')[0]
  const extName = path.extname(fileName)
  const time = dayjs().format('YYYYMMDDHHmmSSS')
  return `${name}-${time}${extName}`
}

export function getFilePath(name: string, currentDate: string, type: string) {
  const prefix = normalizeUrlPrefix(env('PUBLIC_UPLOAD_URL_PREFIX', '/upload'))
  return `${prefix}/${currentDate}/${type}/${name}`
}

export function getProtectedUploadPath(tenantId: number, areaId: number, name: string, currentDate: string, type: string) {
  return path.posix.join('tenant', String(tenantId), 'area', String(areaId), currentDate, type, name)
}

export function getProtectedUploadRoot() {
  const configuredRoot = env('PROTECTED_UPLOAD_ROOT', '').trim()
  if (!configuredRoot)
    return path.resolve(cwd, 'protected-upload')
  return path.resolve(cwd, configuredRoot)
}

export function getPublicUploadRoot() {
  const configuredRoot = env('PUBLIC_UPLOAD_ROOT', '').trim()
  if (!configuredRoot)
    return path.resolve(cwd, 'public/upload')
  return path.resolve(cwd, configuredRoot)
}

function normalizeUrlPrefix(prefix: string) {
  const normalized = (prefix || '/upload').trim().replace(/\/+$/, '')
  return normalized.startsWith('/') ? normalized : `/${normalized}`
}

export async function saveLocalFile(buffer: Buffer, name: string, currentDate: string, type: string, tenantId?: number, areaId?: number) {
  const root = tenantId && areaId
    ? getProtectedUploadRoot()
    : getPublicUploadRoot()
  const filePath = tenantId && areaId
    ? path.join(root, 'tenant', String(tenantId), 'area', String(areaId), currentDate, type)
    : path.join(root, `${currentDate}/`, `${type}/`)
  try {
    // 判断是否有该文件夹
    await fs.promises.stat(filePath)
  }
  catch (error) {
    // 没有该文件夹就创建
    await fs.promises.mkdir(filePath, { recursive: true })
  }
  await fs.promises.writeFile(path.join(filePath, name), buffer)
}

export function resolveProtectedUploadPath(relativePath: string) {
  const root = getProtectedUploadRoot()
  const resolvedPath = path.resolve(root, relativePath)
  const resolvedRoot = path.resolve(root)
  if (resolvedPath !== resolvedRoot && !resolvedPath.startsWith(`${resolvedRoot}${path.sep}`))
    throw new Error('Invalid protected file path')
  return resolvedPath
}

export async function saveFile(file: MultipartFile, name: string) {
  const filePath = path.join(getPublicUploadRoot(), name)
  const writeStream = fs.createWriteStream(filePath)
  const buffer = await file.toBuffer()
  writeStream.write(buffer)
}

export async function deleteFile(name: string) {
  const normalizedName = name.replace(/\\/g, '/')
  const targetPath = path.isAbsolute(name)
    ? name
    : normalizedName.startsWith('tenant/')
      ? resolveProtectedUploadPath(name)
      : path.join(getPublicUploadRoot(), normalizedName.replace(/^\/?upload\//, ''))
  fs.unlink(targetPath, () => {
    // console.log(error);
  })
}
