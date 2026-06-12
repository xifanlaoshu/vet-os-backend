import type { ConfigKeyPaths } from './config'
import cluster from 'node:cluster'

import path from 'node:path'
import {
  HttpStatus,
  Logger,
  UnprocessableEntityException,
  ValidationPipe,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'

import { NestFastifyApplication } from '@nestjs/platform-fastify'

import { useContainer } from 'class-validator'
import helmet from 'helmet'

import { AppModule } from './app.module'
import { fastifyApp } from './common/adapters/fastify.adapter'
import { RedisIoAdapter } from './common/adapters/socket.adapter'
import { LoggingInterceptor } from './common/interceptors/logging.interceptor'
import { isDev, isMainProcess } from './global/env'
import { setupSwagger } from './setup-swagger'
import { LoggerService } from './shared/logger/logger.service'

declare const module: any

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    fastifyApp,
    {
      bufferLogs: true,
      snapshot: true,
      // forceCloseConnections: true,
    },
  )

  const configService = app.get(ConfigService<ConfigKeyPaths>)

  assertProductionSecurityConfig(configService)

  const { port, globalPrefix, corsOrigins } = configService.get('app', { infer: true })

  useContainer(app.select(AppModule), { fallbackOnErrors: true })

  app.use(helmet({
    contentSecurityPolicy: isDev ? false : undefined,
    crossOriginEmbedderPolicy: false,
  }))

  app.enableCors({
    origin: (origin, callback) => {
      if (isDev || !origin || corsOrigins.includes(origin))
        return callback(null, true)

      return callback(new Error('Not allowed by CORS'), false)
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Accept-Language', 'X-Area-Id'],
  })

  app.setGlobalPrefix(globalPrefix)
  app.useStaticAssets({ root: path.join(__dirname, '..', 'public') })

  if (!isDev)
    app.enableShutdownHooks()

  if (isDev)
    app.useGlobalInterceptors(new LoggingInterceptor())

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: !isDev,
      transformOptions: { enableImplicitConversion: true },
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      stopAtFirstError: true,
      exceptionFactory: errors =>
        new UnprocessableEntityException(
          errors.map((e) => {
            const rule = Object.keys(e.constraints!)[0]
            const msg = e.constraints![rule]
            return msg
          })[0],
        ),
    }),
  )

  app.useWebSocketAdapter(new RedisIoAdapter(app))

  const printSwaggerLog = setupSwagger(app, configService)

  await app.listen(port, '0.0.0.0', async () => {
    app.useLogger(app.get(LoggerService))
    const url = await app.getUrl()
    const { pid } = process
    const env = cluster.isPrimary
    const prefix = env ? 'P' : 'W'

    if (!isMainProcess)
      return

    printSwaggerLog?.()

    const logger = new Logger('NestApplication')
    logger.log(`[${prefix + pid}] Server running on ${url}`)
  })

  if (module.hot) {
    module.hot.accept()
    module.hot.dispose(() => app.close())
  }
}

function assertProductionSecurityConfig(configService: ConfigService<ConfigKeyPaths>) {
  if (process.env.NODE_ENV !== 'production')
    return

  const appConfig = configService.get('app', { infer: true })
  const securityConfig = configService.get('security', { infer: true })
  const swaggerConfig = configService.get('swagger', { infer: true })
  const weakSecrets = new Set(['', 'changeme', 'change-me', 'secret', 'jwt-secret', 'default'])
  const errors: string[] = []

  const assertStrongSecret = (name: string, value?: string) => {
    const normalized = (value || '').trim()
    if (normalized.length < 32 || weakSecrets.has(normalized.toLowerCase()))
      errors.push(`${name} must be at least 32 characters and must not use a default value`)
  }

  assertStrongSecret('JWT_SECRET', securityConfig.jwtSecret)
  assertStrongSecret('REFRESH_TOKEN_SECRET', securityConfig.refreshSecret)
  assertStrongSecret('COOKIE_SECRET', securityConfig.cookieSecret)

  if (securityConfig.jwtSecret && securityConfig.jwtSecret === securityConfig.refreshSecret)
    errors.push('JWT_SECRET and REFRESH_TOKEN_SECRET must be different')
  if (securityConfig.jwtExprire > 30 * 60)
    errors.push('JWT_EXPIRE must not exceed 1800 seconds in production')
  if (securityConfig.refreshExpire > 30 * 24 * 60 * 60)
    errors.push('REFRESH_TOKEN_EXPIRE must not exceed 30 days in production')
  if (!appConfig.corsOrigins.length || appConfig.corsOrigins.includes('*'))
    errors.push('CORS_ORIGINS must explicitly list trusted origins in production')
  if (!appConfig.trustProxy)
    errors.push('TRUST_PROXY must be true in production and the app must run behind a trusted reverse proxy/WAF')
  if (appConfig.allowPublicRegister)
    errors.push('ALLOW_PUBLIC_REGISTER must be false in production')
  if (!appConfig.strictRbac)
    errors.push('STRICT_RBAC must be true in production')
  if (!appConfig.strictTenantContext)
    errors.push('STRICT_TENANT_CONTEXT must be true in production')
  if (swaggerConfig.enable)
    errors.push('SWAGGER_ENABLE must be false in production')

  if (errors.length)
    throw new Error(`Unsafe production security configuration:\n${errors.map(item => `- ${item}`).join('\n')}`)
}

bootstrap()
