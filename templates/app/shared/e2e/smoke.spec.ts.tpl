/**
 * Smoke: the app renders. Extend this suite as features land — every
 * user-facing flow gets a spec that drives it the way a person would.
 *
 * `npm run test:e2e` runs these against the live preview inside a molecule
 * sandbox and against real browsers on your machine (see `./bonds.ts`).
 *
 * Assert on what the app DOES, never on the sample content it ships with. A
 * spec that names a seeded row ("Acme Corp", a demo post's title, "6 items")
 * fails the day that content is replaced — on an app that is working. Anchor on
 * a role, a `data-mol-id`, a route or a non-empty list; when a test needs a
 * specific record, read it from the same endpoint the page reads, or create it
 * through the UI first.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import './bonds.js'

/** `/` may legitimately redirect before anything renders (an AuthGuard sending
 * a signed-out visit to /login, a locale or onboarding hop) — and Playwright's
 * goto resolves on the initial document's `load`, BEFORE the client-side
 * redirect has painted. Poll until the page the router actually landed on has
 * text; reading one frame earlier measures the teardown, not the app. */
const settledText = (page: { locator: (selector: string) => { innerText(): Promise<string> } }) =>
  page.locator('body').innerText()

test('the home page renders visible content', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('body')).toBeVisible()
  await expect
    .poll(async () => (await settledText(page)).trim().length, { timeout: 15_000 })
    .toBeGreaterThan(0)
})

test('the home page still renders at phone width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }).catch(() => undefined) // a plain tab cannot resize; the IDE can
  await page.goto('/')
  await expect
    .poll(async () => (await settledText(page)).trim().length, { timeout: 15_000 })
    .toBeGreaterThan(0)
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)
})
