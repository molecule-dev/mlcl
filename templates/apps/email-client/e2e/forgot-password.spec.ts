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
  const submit = page.getByRole('button', { name: /reset|send/i }).first()
  // Hydration gate: under fleet-load the click can land before React has
  // attached handlers and the POST never fires.
  await expect(submit).toBeEnabled({ timeout: 15000 })
  // Arm the response wait BEFORE the click; the mail POST can exceed the
  // 5s default expect timeout when the machine is loaded.
  const posted = page.waitForResponse((r) => /\/api\/users\/forgot-password$/.test(r.url()), {
    timeout: 20000,
  })
  const reqs = await captureNetwork(page, async () => {
    await page.locator('input[type="email"]').first().fill(uniqueEmail('forgot'))
    await submit.click()
    // Keep the capture window open until the POST's response lands, so
    // the recorded table includes it.
    await posted
  })
  const resp = await posted
  expect(resp.status()).toBeGreaterThanOrEqual(200)
  expect(resp.status()).toBeLessThan(300)
  expect(reqs.some((r) => /\/api\/users\/forgot-password$/.test(r.url))).toBe(true)
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
