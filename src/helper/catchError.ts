import { Logger } from '@nestjs/common'

const logger = new Logger('UnhandledRejection')

export function catchError() {
  process.on('unhandledRejection', (reason, p) => {
    const message = reason instanceof Error ? reason.stack : 'unknown rejection'
    logger.error(`Unhandled promise rejection: ${message}`)
  })
}
