import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { createServerFactory } from '@molecule/api-server-default-express'

import { setupBonds } from './bonds/index.js'
import { runMigrations } from './scripts/migrate.js'
import { setupEntitlements } from './tiers.js'

export const create = createServerFactory({
  setupBonds,
  runMigrations,
  getRouter: () => import('./App/router.js'),
  postBondsSetup: setupEntitlements,
  // The multipart photo upload route MUST be mounted before the shared body
  // parser: that parser runs busboy with `files: 0` and silently drains
  // multipart file streams, so the photos router's own busboy would see an
  // already-consumed request — no 'file' event, no 'finish', and the request
  // hangs forever (no error, no response). `createServerFactory`'s
  // preBodyParser hook exists for exactly this shape.
  preBodyParser: async (app) => {
    const { authorization: userAuthorization } = await import('./App/Resource/User/index.js')
    const { default: photos } = await import('./handlers/photos.js')
    app.use('/api/issues/photo', userAuthorization.verifyMiddleware(), photos)
  },
})

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  create()
}
