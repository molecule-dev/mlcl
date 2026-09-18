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
      await page.waitForLoadState('networkidle')
      const url = new URL(page.url())
      expect(url.pathname).not.toBe(r.mustNotEqual)
    })
  }
})
