import { BeforeApplicationShutdown, Controller, Headers, Ip, Param, ParseIntPipe, Req, Res, Sse } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { SkipThrottle } from '@nestjs/throttler'
import { FastifyReply, FastifyRequest } from 'fastify'
import { interval, Observable } from 'rxjs'

import { ApiSecurityAuth } from '~/common/decorators/swagger.decorator'
import { BusinessException } from '~/common/exceptions/biz.exception'
import { ErrorEnum } from '~/constants/error-code.constant'
import { AllowAnon } from '~/modules/auth/decorators/allow-anon.decorator'

import { OnlineService } from '../system/online/online.service'
import { MessageEvent, SseService } from './sse.service'

@ApiTags('System - SSE')
@ApiSecurityAuth()
@SkipThrottle()
@Controller('sse')
export class SseController implements BeforeApplicationShutdown {
  private replyMap: Map<number, FastifyReply> = new Map()

  constructor(
    private readonly sseService: SseService,
    private onlineService: OnlineService,
  ) {}

  private closeAllConnect() {
    this.sseService.sendToAllUser({
      type: 'close',
      data: 'bye~',
    })
    this.replyMap.forEach((reply) => {
      reply.raw.end().destroy()
    })
  }

  beforeApplicationShutdown() {
    this.closeAllConnect()
  }

  @ApiOperation({ summary: 'Server-sent events stream' })
  @Sse(':uid')
  @AllowAnon()
  async sse(
    @Param('uid', ParseIntPipe) uid: number,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
    @Ip() ip: string,
    @Headers('user-agent') ua: string,
  ): Promise<Observable<MessageEvent>> {
    if (req.user?.uid !== uid)
      throw new BusinessException(ErrorEnum.NO_PERMISSION)

    this.replyMap.set(uid, res)
    this.onlineService.addOnlineUser(req.accessToken, ip, ua)

    return new Observable((subscriber) => {
      const subscription = interval(12000).subscribe(() => {
        subscriber.next({ type: 'ping' })
      })
      this.sseService.addClient(uid, subscriber)

      req.raw.on('close', () => {
        subscription.unsubscribe()
        this.sseService.removeClient(uid, subscriber)
        this.replyMap.delete(uid)
        this.onlineService.removeOnlineUser(req.accessToken)
      })
    })
  }
}
