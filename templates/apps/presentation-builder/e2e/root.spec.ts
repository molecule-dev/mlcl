/**
 * /  (Landing) — public marketing root.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test('root: landing page renders something (body not empty)', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await expect(page.locator('body')).not.toBeEmpty()
})

test('root: a sign-up CTA is reachable', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  // Either a "Get started" link, "Sign up" link, or just /signup link presence.
  //
  // What was wrong: `page.goto()` resolves on the `load` event, but this is a Vite
  // SPA — at that instant `#root` is still literally empty (measured:
  // `innerHTML.length === 0`, zero matching anchors) and React paints ~150-200ms
  // later, at which point 5 anchors match. `count()` is a one-shot read with NO
  // auto-waiting, so it sampled the pre-paint DOM and returned 0. A web-first
  // assertion retries until the CTA is really there, and `toBeVisible` is strictly
  // stronger than the old presence-only count.
  await expect(page.locator('a[href="/signup"], a[href="/login"]').first()).toBeVisible()
})

test('root: navigation to /signup is possible from the landing page', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await page.goto(APP_BASE + '/signup')
  await expect(page).toHaveURL(/\/signup/)
})
