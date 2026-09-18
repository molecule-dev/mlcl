import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { createServerFactory } from '@molecule/api-server-default-express'

import { setupBonds } from './bonds/index.js'
import { runMigrations } from './scripts/migrate.js'

export const create = createServerFactory({
  setupBonds,
  runMigrations,
  getRouter: () => import('./App/router.js'),
})

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  create()
}
