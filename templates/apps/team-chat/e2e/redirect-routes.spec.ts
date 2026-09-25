/**
 * Sanity-check that the AuthGuard-bypassing redirect routes (referenced
 * from the dashboard quick-actions card and the New Message link) all
 * land somewhere useful.
 *
 * Routes covered (each is a `<Navigate to=…>` route in App.tsx):
 *   /channels/new   -> /channels/general (and forwards to a real channel)
 *   /new-message    -> /channels/general
 *   /compose        -> /channels/general
 *   /dm/new         -> /
 *   /invite         -> /settings
 *   /billing        -> /settings
 *
 * For each route we assert that the URL settles off the redirect path on
 * a signed-in session — the goal is "a click never dead-ends on an
 * unmounted route".
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiSignupAndPrime, uniqueEmail } from './_helpers.js'

const REDIRECTS: Array<{ from: string; mustNotEqual: string }> = [
  { from: '/channels/new', mustNotEqual: '/channels/new' },
  { from: '/new-message', mustNotEqual: '/new-message' },
  { from: '/compose', mustNotEqual: '/compose' },
  { from: '/dm/new', mustNotEqual: '/dm/new' },
  { from: '/invite', mustNotEqual: '/invite' },
  { from: '/billing', mustNotEqual: '/billing' },
]

test.describe('redirect-only routes', () => {
  test.beforeEach(async ({ page }) => {
    await apiSignupAndPrime(page, uniqueEmail('redir'))
  })

  for (const r of REDIRECTS) {
    test(`route ${r.from} redirects off itself`, async ({ page }) => {
      await page.goto(APP_BASE + r.from)
      // The redirect is a client-side <Navigate>: the SPA can still be
      // hydrating when the network goes idle, so a one-shot URL read races
      // the mount (seen as a flake under load). Poll until the URL settles
      // off the redirect path instead.
      await expect
        .poll(() => new URL(page.url()).pathname, { timeout: 10_000 })
        .not.toBe(r.mustNotEqual)
    })
  }
})
