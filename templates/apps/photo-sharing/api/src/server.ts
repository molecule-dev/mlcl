import express from 'express'
import { appendFileSync } from 'fs'
import https from 'https'
import { createRequire } from 'module'
import process from 'process'
import { fileURLToPath } from 'url'

import { logger } from '@molecule/api-logger'
import { bodyParser as bodyParserMiddleware } from '@molecule/api-middleware-body-parser'
import { cookieParser as cookieParserMiddleware } from '@molecule/api-middleware-cookie-parser'
import { cors as corsMiddleware } from '@molecule/api-middleware-cors'

import { setupBonds } from './bonds/index.js'
import { runMigrations } from './scripts/migrate.js'

// The molecule.dev IDE sets MOL_API_ERROR_LOG to the file it reads fatal API errors from.
const ERROR_LOG = process.env.MOL_API_ERROR_LOG ?? ''
process.on('uncaughtExceptionMonitor', (error) => {
  const entry = `[${new Date().toISOString()}] Uncaught exception: ${error.stack || error.message}\n`
  if (ERROR_LOG) {
    try {
      appendFileSync(ERROR_LOG, entry)
    } catch (_error) {
      // An unavailable IDE log must not replace the original fatal error.
    }
  }
  logger.error(error)
})

/** The slice of the optional `pem` package used for self-signed dev certificates. */
interface PemModule {
  createCertificate(
    options: { days: number; selfSigned: boolean },
    callback: (error: Error | null, keys: { serviceKey: string; certificate: string }) => void,
  ): void
}

/**
 * Load the optional `pem` dependency (CommonJS) from this ES module.
 *
 * @returns The `pem` module.
 * @throws {Error} With an install hint when `pem` is not installed.
 */
function loadPem(): PemModule {
  try {
    return createRequire(import.meta.url)('pem') as PemModule
  } catch (error) {
    throw new Error(
      'HTTPS mode needs the optional dependency `pem` to create a self-signed certificate. Install it with `npm install pem`, or unset HTTPS.',
      { cause: error },
    )
  }
}

export const create = async (
  port: number = Number(process.env.PORT) || 4000,
): Promise<express.Express | https.Server> => {
  await runMigrations()
  await setupBonds()

  const { router } = await import('./App/router.js')

  const app = express()
  app.disable('x-powered-by')

  app.use(corsMiddleware)
  app.use(cookieParserMiddleware)
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
    // A self-signed certificate for local HTTPS development.
    const pem = loadPem()
    server = await new Promise<https.Server>((resolve, reject) => {
      pem.createCertificate({ days: 1, selfSigned: true }, (error, keys) => {
        if (error) reject(error)
        else resolve(https.createServer({ key: keys.serviceKey, cert: keys.certificate }, app))
      })
    })
  }

  server.listen(port, () => {
    logger.info(
      `Started ${process.env.NODE_ENV || 'development'} ${process.env.HTTPS ? 'HTTPS' : 'HTTP'} server on port ${port}.`,
    )
  })

  return server
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  create()
}
