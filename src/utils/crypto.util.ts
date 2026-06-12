import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import CryptoJS from 'crypto-js'

const key = CryptoJS.enc.Utf8.parse('buqiyuanabcdefe9bc')
const iv = CryptoJS.enc.Utf8.parse('0123456789buqiyuan')

export function aesEncrypt(data) {
  if (!data)
    return data
  const enc = CryptoJS.AES.encrypt(data, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  })
  return enc.toString()
}

export function aesDecrypt(data) {
  if (!data)
    return data
  const dec = CryptoJS.AES.decrypt(data, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  })
  return dec.toString(CryptoJS.enc.Utf8)
}

export function md5(str: string) {
  return CryptoJS.MD5(str).toString()
}

const scryptAsync = promisify(scrypt)
const PASSWORD_HASH_PREFIX = 'scrypt'
const PASSWORD_HASH_KEY_LENGTH = 64
const SECURE_RANDOM_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const PASSWORD_POLICY = /^\S*(?=\S{12}$)(?=\S*\d)(?=\S*[A-Z])\S*$/i

export function randomSecureValue(size = 32) {
  const bytes = randomBytes(size)
  let value = ''
  for (let i = 0; i < size; i += 1)
    value += SECURE_RANDOM_ALPHABET[bytes[i] % SECURE_RANDOM_ALPHABET.length]
  return value
}

export function legacyMd5Password(password: string, salt: string) {
  return md5(`${password}${salt}`)
}

export function isLegacyPasswordHash(stored: string) {
  return Boolean(stored && !stored.startsWith(`${PASSWORD_HASH_PREFIX}$`))
}

export async function hashPassword(password: string, salt: string) {
  const derivedKey = await scryptAsync(password, salt, PASSWORD_HASH_KEY_LENGTH) as Buffer
  return `${PASSWORD_HASH_PREFIX}$${derivedKey.toString('hex')}`
}

export async function verifyPassword(password: string, salt: string, stored: string) {
  if (!stored)
    return false

  if (isLegacyPasswordHash(stored))
    return legacyMd5Password(password, salt) === stored

  const [algo, encoded] = stored.split('$')
  if (algo !== PASSWORD_HASH_PREFIX || !encoded)
    return false

  const derivedKey = await scryptAsync(password, salt, PASSWORD_HASH_KEY_LENGTH) as Buffer
  const storedKey = Buffer.from(encoded, 'hex')
  return storedKey.length === derivedKey.length && timingSafeEqual(storedKey, derivedKey)
}

export function isStrongPassword(password: string) {
  return PASSWORD_POLICY.test(password)
}
