import express from 'express'
import https from 'https'
import process from 'process'
import { fileURLToPath } from 'url'

import { logger } from '@molecule/api-logger'
import { bodyParser as bodyParserMiddleware } from '@molecule/api-middleware-body-parser'
import { cookieParser as cookieParserMiddleware } from '@molecule/api-middleware-cookie-parser'
import { cors as corsMiddleware } from '@molecule/api-middleware-cors'

import { setupBonds } from './bonds/index.js'
import { photoFilesRouter, uploadsRouter } from './handlers/uploads.js'
import { runMigrations } from './scripts/migrate.js'

process.on('uncaughtException', (error) => logger.error(error))
process.on('unhandledRejection', (error) => logger.error(error))

export const create = async (
  port: number = Number(process.env.PORT) || 4000,
): Promise<express.Express | https.Server> => {
  await runMigrations()
  await setupBonds()

  const { router } = await import('./App/router.js')
  const { authorization: userAuthorization } = await import('./App/Resource/User/index.js')

  const app = express()
  app.disable('x-powered-by')

  // CORS + cookie parsing must run for every request, including the
  // multipart upload route below. The shared body parser uses busboy
  // with files: 0, which silently consumes (and discards) the file
  // bytes — so the upload route MUST be mounted ahead of it. The same
  // applies to the GET file-proxy route, which we keep public so
  // <img src> loads work for unauthenticated viewers (e.g. landing).
  app.use(corsMiddleware)
  app.use(cookieParserMiddleware)
  app.use('/api/photo-files', photoFilesRouter)
  app.use('/api/photo-uploads', userAuthorization.verifyMiddleware(), uploadsRouter)

  app.use(bodyParserMiddleware)

  app.use('/api', router)

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  app.use(((
    error: unknown,
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    // Translated unauthorized strings (e.g. "Unauthorized." from
    // @molecule/api-locales-resource) come through next() as plain strings —
    // map them to a real 401 instead of letting Express default to 500.
    if (typeof error === 'string' && /^Unauthorized\b/i.test(error)) {
      res.status(401).send(error)
      return
    }
    // [L1-1] Never forward an untagged error to Express's finalhandler — in
    // non-production it embeds err.stack in the response body (info disclosure).
    // Delegate to next() only if headers are already sent; otherwise return a
    // generic 500. The stack is logged server-side, never sent to the client.
    logger.error(error)
    if (res.headersSent) return next(error)
    res.status(500).json({ error: 'Internal Server Error' })
  }) as express.ErrorRequestHandler)

  let server: express.Express | https.Server = app
  if (process.env.HTTPS) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pem = require('pem') as {
      createCertificate(
        options: { days: number; selfSigned: boolean },
        callback: (error: Error | null, keys: { serviceKey: string; certificate: string }) => void,
      ): void
    }
    server = await new Promise<https.Server>((resolve, reject) => {
      pem.createCertificate({ days: 1, selfSigned: true }, (error, keys) => {
        if (error) reject(error)
        else resolve(https.createServer({ key: keys.serviceKey, cert: keys.certificate }, app))
      })
    })
  }

  server.listen(port, () => {
    logger.info(
      `Started ${process.env.NODE_ENV} ${process.env.HTTPS ? 'HTTPS' : 'HTTP'} server on port ${port}.`,
    )
  })

  return server
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  create()
}
