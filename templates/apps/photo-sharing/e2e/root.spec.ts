/**
 * /root (Landing) page — public marketing surface.
 *
 * Per-page spec covering each row in observations/root.md.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test('Join Obscura nav link → /signup', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await page
    .getByRole('link', { name: /join obscura/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/signup/, { timeout: 10_000 })
})

test('Sign in nav link → /login', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await page
    .getByRole('link', { name: /^sign in$/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
})

test('Hero "Start sharing" CTA → /signup', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await page
    .getByRole('link', { name: /start sharing/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/signup/, { timeout: 10_000 })
})

test('Hero heading "Light captured, stories shared" rendered', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await expect(page.getByRole('heading', { name: /light captured/i })).toBeVisible()
})

test('Bottom "Create your portfolio" CTA → /signup', async ({ page }) => {
  // Capture network to ensure the page actually loaded (no fatal request error)
  // before trying to interact with the bottom CTA.
  const { reqs } = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/')
    await page.waitForLoadState('networkidle')
  })
  // Sanity-check the page made at least one same-origin request (root html).
  expect(reqs.some((r) => r.url.startsWith(APP_BASE))).toBe(true)
  await page
    .getByRole('link', { name: /create your portfolio/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/signup/, { timeout: 10_000 })
})
