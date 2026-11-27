import { appendFileSync } from 'fs'
import http from 'http'

import express from 'express'
import { fileURLToPath } from 'url'

import { setupBonds } from './bonds/index.js'

// The molecule.dev IDE sets MOL_API_ERROR_LOG to the file it reads fatal API errors from.
const ERROR_LOG = process.env.MOL_API_ERROR_LOG ?? ''
process.on('uncaughtExceptionMonitor', (err) => {
  const entry = `[${new Date().toISOString()}] Uncaught exception: ${err.stack || err.message}\n`
  if (ERROR_LOG) {
    try {
      appendFileSync(ERROR_LOG, entry)
    } catch (_error) {
      // An unavailable IDE log must not replace the original fatal error.
    }
  }
  console.error(entry)
})

/**
 * Import an optional package by a variable specifier, so a project without it still compiles.
 * Only an absent package returns null; one that is installed but fails to load throws its error,
 * instead of the server starting without it.
 */
async function importIfInstalled<T>(specifier: string): Promise<T | null> {
  let entry: string
  try {
    entry = import.meta.resolve(specifier)
  } catch (error) {
    const absent = `Cannot find package '${specifier}' imported from `
    if (error instanceof Error && error.message.startsWith(absent)) return null
    throw error
  }
  return (await import(entry)) as T
}

export const create = async (port: number = Number(process.env.PORT) || 4000) => {
  await setupBonds()

  // Router is imported after bonds — handler maps need providers registered first.
  const { router } = await import('./App/router.js')

  const app = express()
  // Mount the process lifecycle before any route: in-flight request tracking,
  // GET /health/live + GET /health/ready, and SIGTERM/SIGINT graceful shutdown
  // (drain bound SHUTDOWN_TIMEOUT_MS, default 25 s; hooks run in order; exit 0).
  //
  // ZERO-DOWNTIME ROLLING DEPLOYS — declare the load balancer's check cadence:
  // set LB_HEALTHCHECK_INTERVAL_MS and LB_HEALTHCHECK_TIMEOUT_MS in the deploy
  // environment (Fly does not expose [http_service.checks] to the process, so
  // this is the only way the app can know it). The package then derives the
  // shutdown flip window as 3 x interval + timeout + 2 s: readiness answers 503
  // from the first SIGTERM instant, the listener stays open that long so the
  // proxy can observe the failed checks and re-route, then idle keep-alive
  // sockets are dropped and in-flight requests finish. INVARIANT: the flip
  // window must be at least 2 x interval + timeout, or the proxy is still
  // routing here when the listener closes and a rolling restart drops
  // requests. A window that violates it logs one warning at boot.
  // A project scaffolded before this package was installed skips the lifecycle wiring.
  type LifecycleHandle = {
    markReady(): void
    attachServer(server: unknown): void
  }
  const lifecyclePackage = await importIfInstalled<{
    installExpressLifecycle(options: { app: express.Express }): LifecycleHandle
  }>('@molecule/api-process-lifecycle-express')
  const lifecycle = lifecyclePackage?.installExpressLifecycle({ app }) ?? null
  app.use(express.json())
  app.use('/api', router)

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  // Log 5XX responses so the IDE's auto-verification can detect them.
  // Must be registered after routes so it only catches unhandled errors.
  app.use(
    (err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
      const entry = `[${new Date().toISOString()}] ${req.method} ${req.path} 500: ${err.stack || err.message}\n`
      if (ERROR_LOG) {
        try {
          appendFileSync(ERROR_LOG, entry)
        } catch (_error) {
          // An unavailable IDE log must not replace the original request error.
        }
      }
      console.error(entry)
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error' })
      }
    },
  )

  const listener = http.createServer(app)
  // Signal handlers are installed before any request is served, so a SIGTERM
  // arriving during boot still drains instead of killing the process mid-boot.
  lifecycle?.attachServer(listener)

  // A realtime provider bonded with deferAttach (the socketio/ws/sse bond
  // stubs) binds no port of its own, so it is attached to this server before it
  // listens: realtime shares the API port (/socket.io, /sse) instead of a
  // standalone port a container or proxy may not expose.
  const realtime = await importIfInstalled<{
    hasProvider(): boolean
    getProvider(): { attachHttpServer?: (server: unknown) => void }
  }>('@molecule/api-realtime')
  if (realtime?.hasProvider()) realtime.getProvider().attachHttpServer?.(listener)

  listener.listen(port, () => {
    // Boot is complete and the port is owned: /health/ready answers 200 from here.
    lifecycle?.markReady()
    console.log(`Server running on port ${port}`)
  })

  return app
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  create()
}
