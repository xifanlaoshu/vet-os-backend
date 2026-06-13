import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const TOTP_STEP_SECONDS = 30
const TOTP_DIGITS = 6
const ENCRYPTION_PREFIX = 'v1'

function toBase64Url(value: Buffer) {
  return value.toString('base64url')
}

function fromBase64Url(value: string) {
  return Buffer.from(value, 'base64url')
}

export function generateTotpSecret() {
  const bytes = randomBytes(20)
  let bits = ''
  for (const byte of bytes)
    bits += byte.toString(2).padStart(8, '0')

  let secret = ''
  for (let index = 0; index < bits.length; index += 5) {
    const chunk = bits.slice(index, index + 5).padEnd(5, '0')
    secret += BASE32_ALPHABET[Number.parseInt(chunk, 2)]
  }
  return secret
}

function decodeBase32(secret: string) {
  const normalized = secret.replace(/\s|=/g, '').toUpperCase()
  let bits = ''
  for (const char of normalized) {
    const value = BASE32_ALPHABET.indexOf(char)
    if (value < 0)
      throw new Error('Invalid base32 secret.')
    bits += value.toString(2).padStart(5, '0')
  }

  const bytes: number[] = []
  for (let index = 0; index + 8 <= bits.length; index += 8)
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2))
  return Buffer.from(bytes)
}

function hotp(secret: string, counter: number) {
  const counterBuffer = Buffer.alloc(8)
  counterBuffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0)
  counterBuffer.writeUInt32BE(counter >>> 0, 4)

  const digest = createHmac('sha1', decodeBase32(secret)).update(counterBuffer).digest()
  const offset = digest[digest.length - 1] & 0x0F
  const binary = ((digest[offset] & 0x7F) << 24)
    | ((digest[offset + 1] & 0xFF) << 16)
    | ((digest[offset + 2] & 0xFF) << 8)
    | (digest[offset + 3] & 0xFF)
  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, '0')
}

export function verifyTotpCode(secret: string, code: string, now = Date.now()) {
  const normalizedCode = code.trim()
  if (!/^\d{6}$/.test(normalizedCode))
    return false

  const currentCounter = Math.floor(now / 1000 / TOTP_STEP_SECONDS)
  const submitted = Buffer.from(normalizedCode)
  for (let offset = -1; offset <= 1; offset += 1) {
    const expected = Buffer.from(hotp(secret, currentCounter + offset))
    if (expected.length === submitted.length && timingSafeEqual(expected, submitted))
      return true
  }
  return false
}

export function buildTotpAuthUrl(secret: string, issuer: string, accountName: string) {
  const label = `${issuer}:${accountName}`
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(TOTP_DIGITS),
    period: String(TOTP_STEP_SECONDS),
  })
  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`
}

function encryptionKey(secret: string) {
  return createHash('sha256').update(secret).digest()
}

export function encryptMfaSecret(secret: string, encryptionSecret: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(encryptionSecret), iv)
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [ENCRYPTION_PREFIX, toBase64Url(iv), toBase64Url(authTag), toBase64Url(encrypted)].join(':')
}

export function decryptMfaSecret(encryptedSecret: string, encryptionSecret: string) {
  const [prefix, iv, authTag, encrypted] = encryptedSecret.split(':')
  if (prefix !== ENCRYPTION_PREFIX || !iv || !authTag || !encrypted)
    throw new Error('Invalid encrypted MFA secret.')

  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(encryptionSecret), fromBase64Url(iv))
  decipher.setAuthTag(fromBase64Url(authTag))
  return Buffer.concat([
    decipher.update(fromBase64Url(encrypted)),
    decipher.final(),
  ]).toString('utf8')
}
