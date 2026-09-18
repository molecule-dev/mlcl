import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { createServerFactory } from '@molecule/api-server-default-express'

import { setupBonds } from './bonds/index.js'
import { runMigrations } from './scripts/migrate.js'

export const create = createServerFactory({
  setupBonds,
  runMigrations,
  getRouter: () => import('./App/router.js'),
  preBodyParser: async (app) => {
    const { authorization: userAuthorization } = await import('./App/Resource/User/index.js')
    const { default: uploadsRouter } = await import('./handlers/uploads.js')
    app.use('/api/uploads', userAuthorization.verifyMiddleware(), uploadsRouter)
  },
})

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  create()
}
