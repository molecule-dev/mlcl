/**
 * Per-page spec for /forgot-password. Public.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test('GET /forgot-password renders the reset-request form', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  await expect(page.locator('input[type="email"]').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /reset|send/i }).first()).toBeVisible()
})

test('Submitting forgot-password form posts to /api/users/forgot-password', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  const reqs = await captureNetwork(page, async () => {
    await page.locator('input[type="email"]').first().fill(uniqueEmail('forgot'))
    await page
      .getByRole('button', { name: /reset|send/i })
      .first()
      .click()
    await page.waitForLoadState('networkidle')
  })
  expect(
    reqs.some(
      (r) => /\/api\/users\/forgot-password$/.test(r.url) && r.status >= 200 && r.status < 300,
    ),
  ).toBe(true)
})

test('Successful submit shows a non-enumerating confirmation', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  await page.locator('input[type="email"]').first().fill(uniqueEmail('confirm'))
  await page
    .getByRole('button', { name: /reset|send/i })
    .first()
    .click()
  await page.waitForTimeout(800)
  const text = await page.evaluate(() => document.body.innerText)
  expect(text.toLowerCase()).toMatch(/check|sent|email|reset|if you have/)
})
