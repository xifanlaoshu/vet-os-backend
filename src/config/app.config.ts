import { ConfigType, registerAs } from '@nestjs/config'

import { env, envBoolean, envNumber } from '~/global/env'

export const appRegToken = 'app'

const globalPrefix = env('GLOBAL_PREFIX', 'api')
const parseCsv = (value: string) => value.split(',').map(item => item.trim()).filter(Boolean)
export const AppConfig = registerAs(appRegToken, () => ({
  name: env('APP_NAME'),
  port: envNumber('APP_PORT', 3000),
  baseUrl: env('APP_BASE_URL'),
  globalPrefix,
  locale: env('APP_LOCALE', 'zh-CN'),
  corsOrigins: parseCsv(env('CORS_ORIGINS', '')),
  allowPublicRegister: envBoolean('ALLOW_PUBLIC_REGISTER', false),
  strictRbac: envBoolean('STRICT_RBAC', process.env.NODE_ENV === 'production'),
  strictTenantContext: envBoolean('STRICT_TENANT_CONTEXT', process.env.NODE_ENV === 'production'),
  trustProxy: envBoolean('TRUST_PROXY', false),
  /** 是否允许多端登录 */
  multiDeviceLogin: envBoolean('MULTI_DEVICE_LOGIN', true),

  logger: {
    level: env('LOGGER_LEVEL'),
    maxFiles: envNumber('LOGGER_MAX_FILES'),
  },
}))

export type IAppConfig = ConfigType<typeof AppConfig>

export const RouterWhiteList: string[] = [
  `${globalPrefix ? '/' : ''}${globalPrefix}/auth/captcha/img`,
  `${globalPrefix ? '/' : ''}${globalPrefix}/auth/login`,
]
