import express from 'express'
import https from 'https'
import process from 'process'
import { fileURLToPath } from 'url'

import { logger } from '@molecule/api-logger'
import { bodyParser as bodyParserMiddleware } from '@molecule/api-middleware-body-parser'
import { cookieParser as cookieParserMiddleware } from '@molecule/api-middleware-cookie-parser'
import { cors as corsMiddleware } from '@molecule/api-middleware-cors'

import { setupBonds } from './bonds/index.js'
import { runMigrations } from './scripts/migrate.js'
import { seedPublicData } from './scripts/seed-public-data.js'

process.on('uncaughtException', (error) => logger.error(error))
process.on('unhandledRejection', (error) => logger.error(error))

export const create = async (
  port: number = Number(process.env.PORT) || 4000,
): Promise<express.Express | https.Server> => {
  await runMigrations()
  await setupBonds()
  await seedPublicData()

  // Import router after bonds are set up — handler maps are built at module
  // evaluation time, so bond-conditional handlers need providers registered first.
  const { router } = await import('./App/router.js')

  const app = express()
  app.disable('x-powered-by')

  app.use(bodyParserMiddleware)
  app.use(cookieParserMiddleware)
  app.use(corsMiddleware)

  app.use('/api', router)

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  app.use(((
    error: unknown,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    switch (error) {
      case 'Unauthorized':
        res.status(401)
        break
      default:
        // [L1-1] Never forward an untagged error to Express's finalhandler — in
        // non-production it embeds err.stack in the response body (info disclosure).
        // Delegate to next() only if headers are already sent; otherwise return a
        // generic 500. The stack is logged server-side, never sent to the client.
        logger.error(error)
        if (res.headersSent) return next(error)
        res.status(500).json({ error: 'Internal Server Error' })
        return
    }
    res.send(error)
  }) as express.ErrorRequestHandler)

  let server: express.Express | https.Server = app
  if (process.env.HTTPS) {
    // Create a self-signed SSL certificate for local HTTPS development.
    // pem is an optional dependency for local HTTPS development.
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
