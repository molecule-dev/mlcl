import express from 'express'
import https from 'https'
import process from 'process'
import { fileURLToPath } from 'url'

import { logger } from '@molecule/api-logger'
import { bodyParser as bodyParserMiddleware } from '@molecule/api-middleware-body-parser'
import { cookieParser as cookieParserMiddleware } from '@molecule/api-middleware-cookie-parser'
import { cors as corsMiddleware } from '@molecule/api-middleware-cors'
import { authorization as userAuthorization } from '@molecule/api-resource-user'

import { setupBonds } from './bonds/index.js'
import { runMigrations } from './scripts/migrate.js'
import { setupEntitlements } from './tiers.js'

process.on('uncaughtException', (error) => logger.error(error))
process.on('unhandledRejection', (error) => logger.error(error))

export const create = async (
  port: number = Number(process.env.PORT) || 4000,
): Promise<express.Express | https.Server> => {
  await runMigrations()
  await setupBonds()
  // Register the tier registry as the entitlements provider so
  // `enforceLimit` middlewares can look up plan limits at request time.
  setupEntitlements()

  // Seed the public catalog (curated shows + episodes + chapters) so a
  // freshly-created instance has demoable content. Idempotent on stable
  // string IDs; safe to re-run on every boot.
  const { seedCatalogOnce } = await import('./handlers/_seed.js')
  await seedCatalogOnce().catch((error) => {
    // A failed seed must not block boot — empty catalog still serves
    // the create-your-own-show flow. Log and continue.
    logger.error(error)
  })

  // Import router after bonds are set up — handler maps are built at module
  // evaluation time, so bond-conditional handlers need providers registered first.
  const contentHandlers = (await import('./handlers/index.js')).default
  const { router } = await import('./App/router.js')

  const app = express()
  app.disable('x-powered-by')

  app.use(bodyParserMiddleware)
  app.use(cookieParserMiddleware)
  app.use(corsMiddleware)

  // Run JWT verification BEFORE any /api handlers so res.locals.session is
  // populated for both the per-app content routes and the molecule resource
  // routes (users, devices). Without this the content-handler
  // `getUserId(res)` always returns null and every authed POST short-circuits
  // to 401 even with a valid Bearer/cookie.
  app.use('/api', userAuthorization.verifyMiddleware())

  // Seed per-user demo content (subscriptions, queue, saved, notifications)
  // on first authenticated request. seedDemoForUserOnce() de-dupes per
  // process via a promise cache — concurrent authed requests for the same
  // user share one seed run. Subsequent requests resolve instantly. We
  // AWAIT (not fire-and-forget) because the next request after signup is
  // typically the Library page loading /api/subscriptions/shows, which
  // needs to see the seeded rows. The first authed request pays a small
  // one-time cost; everything after is free.
  const { seedDemoForUserOnce } = await import('./handlers/_seed.js')
  app.use('/api', async (_req, res, next) => {
    const userId = (res.locals.session as { userId?: string } | undefined)?.userId
    if (userId) {
      try {
        await seedDemoForUserOnce(userId)
      } catch (error) {
        logger.error(error)
      }
    }
    next()
  })

  app.use('/api', contentHandlers)
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
    // The molecule auth middleware passes the i18n-translated string
    // (e.g. `'Unauthorized.'` with trailing period) via `next(t(...))`, so
    // we match against the translation prefix rather than a literal
    // 'Unauthorized'. Otherwise the locale's punctuation drift causes
    // legitimate 401s to fall through to the default handler as 500s.
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
