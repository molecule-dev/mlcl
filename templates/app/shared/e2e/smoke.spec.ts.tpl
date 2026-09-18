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

test('the home page renders visible content', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('body')).toBeVisible()
  const text = (await page.locator('body').innerText()).trim()
  expect(text.length).toBeGreaterThan(0)
})

test('the home page still renders at phone width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }).catch(() => undefined) // a plain tab cannot resize; the IDE can
  await page.goto('/')
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)
})
