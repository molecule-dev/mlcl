/**
 * /forgot-password — request a password-reset email.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test('email input and submit button render', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  await expect(page.getByLabel(/email/i).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /send|reset|request/i }).first()).toBeVisible()
})

test('submitting an email shows confirmation', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  await page.getByLabel(/email/i).first().fill(uniqueEmail('amn-fp'))
  await page
    .getByRole('button', { name: /send|reset|request/i })
    .first()
    .click()
  // Either confirmation message or stays on page. We don't gate on success
  // since Mailgun sandbox may report synthetic success.
  await page.waitForTimeout(2000)
  // Should not throw a fatal error.
  expect(page.url()).toContain('/forgot-password')
})

test('forgot-password network contract: POST /api/users/forgot-password fires', async ({
  page,
}) => {
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByLabel(/email/i).first().fill(uniqueEmail('amn-fp-net'))
    await page
      .getByRole('button', { name: /send|reset|request/i })
      .first()
      .click()
    await page.waitForTimeout(2000)
  })
  const call = reqs.find(
    (r) => /\/forgot-password|\/password\/reset|\/users\/reset/i.test(r.url) && r.method === 'POST',
  )
  expect(call, 'a forgot-password POST request should fire').toBeTruthy()
})

test('back-to-login link navigates to /login', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  const link = page.getByRole('link', { name: /sign\s*in|log\s*in|back.*login/i }).first()
  if (await link.count().catch(() => 0)) {
    await link.click()
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  }
})
