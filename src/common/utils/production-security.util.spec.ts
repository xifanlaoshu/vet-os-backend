import { assertProductionSecurityConfig } from './production-security.util'

function createConfigService(overrides: Record<string, any> = {}) {
  const defaults = {
    app: {
      corsOrigins: ['https://app.example.com'],
      trustProxy: true,
      allowPublicRegister: false,
      strictRbac: true,
      strictTenantContext: true,
      protectedUploadRoot: 'D:/vet-os-data/protected-upload',
      publicUploadRoot: 'D:/vet-os-data/public-upload',
    },
    security: {
      jwtSecret: 'jwt-secret-with-enough-random-looking-length-1234567890',
      refreshSecret: 'refresh-secret-with-enough-random-looking-length-1234567890',
      cookieSecret: 'cookie-secret-with-enough-random-looking-length-1234567890',
      jwtExprire: 1800,
      refreshExpire: 30 * 24 * 60 * 60,
    },
    swagger: {
      enable: false,
    },
  }
  return {
    get: jest.fn((key: string) => ({
      ...defaults[key],
      ...(overrides[key] || {}),
    })),
  }
}

describe('production security configuration guard', () => {
  const originalNodeEnv = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
  })

  it('does not block non-production startup', () => {
    process.env.NODE_ENV = 'development'
    const configService = createConfigService({
      security: {
        jwtSecret: 'replace-with-placeholder',
      },
    })

    expect(() => assertProductionSecurityConfig(configService as any)).not.toThrow()
  })

  it('rejects placeholder secrets in production', () => {
    process.env.NODE_ENV = 'production'
    const configService = createConfigService({
      security: {
        jwtSecret: 'replace-with-64-random-chars-jwt-secret-prod-20260612',
      },
    })

    expect(() => assertProductionSecurityConfig(configService as any)).toThrow(/JWT_SECRET/)
  })

  it('accepts a hardened production baseline', () => {
    process.env.NODE_ENV = 'production'
    const configService = createConfigService()

    expect(() => assertProductionSecurityConfig(configService as any)).not.toThrow()
  })

  it('rejects missing protected upload root in production', () => {
    process.env.NODE_ENV = 'production'
    const configService = createConfigService({
      app: {
        protectedUploadRoot: '',
      },
    })

    expect(() => assertProductionSecurityConfig(configService as any)).toThrow(/PROTECTED_UPLOAD_ROOT/)
  })

  it('rejects public-directory protected upload roots in production', () => {
    process.env.NODE_ENV = 'production'
    const configService = createConfigService({
      app: {
        protectedUploadRoot: 'public/protected-upload',
      },
    })

    expect(() => assertProductionSecurityConfig(configService as any)).toThrow(/PROTECTED_UPLOAD_ROOT/)
  })

  it('rejects protected upload roots inside configured public upload roots in production', () => {
    process.env.NODE_ENV = 'production'
    const configService = createConfigService({
      app: {
        protectedUploadRoot: 'runtime/public-upload/protected',
        publicUploadRoot: 'runtime/public-upload',
      },
    })

    expect(() => assertProductionSecurityConfig(configService as any)).toThrow(/PROTECTED_UPLOAD_ROOT/)
  })
})
