import { ConfigType, registerAs } from '@nestjs/config'

import { env, envNumber } from '~/global/env'

export const securityRegToken = 'security'

export const SecurityConfig = registerAs(securityRegToken, () => ({
  jwtSecret: env('JWT_SECRET'),
  jwtExprire: envNumber('JWT_EXPIRE'),
  refreshSecret: env('REFRESH_TOKEN_SECRET'),
  refreshExpire: envNumber('REFRESH_TOKEN_EXPIRE'),
  loginFailLimit: envNumber('LOGIN_FAIL_LIMIT', 5),
  loginFailWindow: envNumber('LOGIN_FAIL_WINDOW', 15 * 60),
  loginLockSeconds: envNumber('LOGIN_LOCK_SECONDS', 15 * 60),
}))

export type ISecurityConfig = ConfigType<typeof SecurityConfig>
