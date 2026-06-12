import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { FastifyReply, FastifyRequest } from 'fastify'
import { QueryFailedError } from 'typeorm'

import { BusinessException } from '~/common/exceptions/biz.exception'
import { ErrorEnum } from '~/constants/error-code.constant'

import { isDev } from '~/global/env'

interface RuntimeErrorLike {
  readonly status?: number
  readonly statusCode?: number
  readonly message?: string
  readonly response?: {
    readonly message?: string
  }
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  constructor() {
    this.registerCatchAllExceptionsHook()
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const request = ctx.getRequest<FastifyRequest>()
    const response = ctx.getResponse<FastifyReply>()

    const url = request.raw.url!
    const status = this.getStatus(exception)
    let message = this.getErrorMessage(exception)

    if (status === HttpStatus.INTERNAL_SERVER_ERROR && !(exception instanceof BusinessException)) {
      const errorSummary = this.getSafeErrorSummary(exception)
      this.logger.error(`Internal server error: ${errorSummary.message}`, errorSummary.stack)

      if (!isDev)
        message = ErrorEnum.SERVER_ERROR?.split(':')[1]
    }
    else {
      this.logger.warn(`Request error: (${status}) ${message} Path: ${decodeURI(url)}`)
    }

    const apiErrorCode = exception instanceof BusinessException ? exception.getErrorCode() : status

    const resBody: IBaseResponse = {
      code: apiErrorCode,
      message,
      data: null,
    }

    response.status(status).send(resBody)
  }

  getStatus(exception: unknown): number {
    if (exception instanceof HttpException)
      return exception.getStatus()

    if (exception instanceof QueryFailedError)
      return HttpStatus.INTERNAL_SERVER_ERROR

    const runtimeError = exception as RuntimeErrorLike
    return runtimeError?.status ?? runtimeError?.statusCode ?? HttpStatus.INTERNAL_SERVER_ERROR
  }

  getErrorMessage(exception: unknown): string {
    if (exception instanceof HttpException)
      return exception.message

    if (exception instanceof QueryFailedError)
      return exception.message

    const runtimeError = exception as RuntimeErrorLike
    return runtimeError?.response?.message ?? runtimeError?.message ?? `${exception}`
  }

  private getSafeErrorSummary(exception: unknown): { message: string, stack?: string } {
    if (exception instanceof Error) {
      return {
        message: exception.message,
        stack: exception.stack,
      }
    }

    return {
      message: typeof exception === 'string' ? exception : 'Unknown non-error exception',
    }
  }

  registerCatchAllExceptionsHook() {
    process.on('unhandledRejection', (reason) => {
      this.logger.error('unhandledRejection', reason instanceof Error ? reason.stack : String(reason))
    })

    process.on('uncaughtException', (err) => {
      this.logger.error('uncaughtException', err.stack)
    })
  }
}
