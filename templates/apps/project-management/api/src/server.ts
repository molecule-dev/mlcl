import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { createServerFactory } from '@molecule/api-server-default-express'

import { setupBonds } from './bonds/index.js'
import { runMigrations } from './scripts/migrate.js'
import { setupEntitlements } from './tiers.js'

// The session middleware and the content handlers are mounted in App/router.ts,
// in one place, where the app's own auth options apply — not here.
export const create = createServerFactory({
  setupBonds,
  runMigrations,
  getRouter: () => import('./App/router.js'),
  postBondsSetup: setupEntitlements,
})

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  create()
}
