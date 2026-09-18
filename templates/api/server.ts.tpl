import { appendFileSync } from 'fs'

import express from 'express'
import { fileURLToPath } from 'url'

import { setupBonds } from './bonds/index.js'

// Capture runtime errors and write to a well-known file so the IDE's
// auto-verification can detect them and feed them to the AI for fixing.
const ERROR_LOG = '/workspace/.api-errors.log'
process.on('uncaughtException', (err) => {
  const entry = `[${new Date().toISOString()}] Uncaught exception: ${err.stack || err.message}\n`
  try { appendFileSync(ERROR_LOG, entry) } catch { /* ignore */ }
  console.error(entry)
})
process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? (reason.stack || reason.message) : String(reason)
  const entry = `[${new Date().toISOString()}] Unhandled rejection: ${msg}\n`
  try { appendFileSync(ERROR_LOG, entry) } catch { /* ignore */ }
  console.error(entry)
})

export const create = async (port: number = Number(process.env.PORT) || 4000) => {
  await setupBonds()

  // Router is imported after bonds — handler maps need providers registered first.
  const { router } = await import('./App/router.js')

  const app = express()
  app.use(express.json())
  app.use('/api', router)

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  // Log 5XX responses so the IDE's auto-verification can detect them.
  // Must be registered after routes so it only catches unhandled errors.
  app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const entry = `[${new Date().toISOString()}] ${req.method} ${req.path} 500: ${err.stack || err.message}\n`
    try { appendFileSync(ERROR_LOG, entry) } catch { /* ignore */ }
    console.error(entry)
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal Server Error' })
    }
  })

  const listener = app.listen(port, () => {
    console.log(`Server running on port ${port}`)
  })

  // A realtime provider bonded with deferAttach (the socketio/ws/sse bond
  // stubs) binds no port of its own — attach it to the API's HTTP server so
  // realtime shares the API port (e.g. /socket.io, /sse) instead of a
  // standalone port a container/proxy may not expose. The import specifier is
  // a variable on purpose: projects WITHOUT a realtime package must compile
  // (no static dependency) and simply skip the attach at runtime.
  try {
    const realtimePackage = '@molecule/api-realtime'
    const realtime = (await import(realtimePackage)) as {
      hasProvider(): boolean
      getProvider(): { attachHttpServer?: (server: unknown) => void }
    }
    if (realtime.hasProvider()) realtime.getProvider().attachHttpServer?.(listener)
  } catch (_error) {
    // @molecule/api-realtime is not installed in this project — nothing to attach.
  }

  return app
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  create()
}
