import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { DiscoveryService, Reflector } from '@nestjs/core'

import { AppConfig, IAppConfig } from '~/config'

import { ALLOW_ANON_KEY, PERMISSION_KEY, PUBLIC_KEY } from '../auth.constant'

@Injectable()
export class PermissionMetadataAuditService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PermissionMetadataAuditService.name)

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly reflector: Reflector,
    @Inject(AppConfig.KEY) private readonly appConfig: IAppConfig,
  ) {}

  onApplicationBootstrap() {
    const missingRoutes = this.discoveryService
      .getControllers()
      .flatMap((wrapper) => {
        const instance = wrapper.instance
        if (!instance)
          return []

        const prototype = Object.getPrototypeOf(instance)
        const classRef = wrapper.metatype
        return Object.getOwnPropertyNames(prototype)
          .filter(methodName => methodName !== 'constructor' && typeof prototype[methodName] === 'function')
          .filter((methodName) => {
            const handler = prototype[methodName]
            return !this.hasAccessMetadata(handler, classRef)
          })
          .map(methodName => `${classRef?.name ?? 'AnonymousController'}.${methodName}`)
      })

    if (!missingRoutes.length)
      return

    const message = `Missing access metadata on controller handlers: ${missingRoutes.join(', ')}`
    if (this.appConfig.strictRbac)
      throw new Error(message)

    this.logger.warn(message)
  }

  private hasAccessMetadata(handler: object, classRef?: object) {
    const targets = [handler, classRef].filter(Boolean) as any[]
    return Boolean(
      this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, targets)
      || this.reflector.getAllAndOverride<boolean>(ALLOW_ANON_KEY, targets)
      || this.reflector.getAllAndOverride<string | string[]>(PERMISSION_KEY, targets),
    )
  }
}
