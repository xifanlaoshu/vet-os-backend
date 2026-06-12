import FastifyCookie from '@fastify/cookie'
import FastifyMultipart from '@fastify/multipart'
import { FastifyAdapter } from '@nestjs/platform-fastify'

const app: FastifyAdapter = new FastifyAdapter({
  // @see https://www.fastify.io/docs/latest/Reference/Server/#trustproxy
  trustProxy: process.env.TRUST_PROXY === 'true',
  logger: false,
  // forceCloseConnections: true,
})
export { app as fastifyApp }

app.register(FastifyMultipart, {
  limits: {
    fields: 10, // Max number of non-file fields
    fileSize: 1024 * 1024 * 100, // visit media videos need a higher local upload ceiling
    files: 20, // Max number of file fields
  },
})

app.register(FastifyCookie, {
  secret: process.env.COOKIE_SECRET || 'dev-cookie-secret-change-me',
})

app.getInstance().addHook('onRequest', (request, reply, done) => {
  // forbidden php

  const { url } = request

  if (url.endsWith('.php')) {
    reply.raw.statusMessage
      = 'Eh. PHP is not support on this machine. Yep, I also think PHP is bestest programming language. But for me it is beyond my reach.'

    return reply.code(418).send()
  }

  // skip favicon request
  if (url.match(/favicon.ico$/) || url.match(/manifest.json$/))
    return reply.code(204).send()

  done()
})
