/**
 * /forgot-password — public form to request a password-reset email.
 * Verifies UI rendering, real backend POST, and post-submission
 * confirmation pane.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test('/forgot-password renders email input + submit + back link', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  await expect(page.locator('[data-mol-id="forgot-email"]')).toBeVisible()
  await expect(page.locator('[data-mol-id="forgot-submit"]')).toBeVisible()
  await expect(page.locator('[data-mol-id="forgot-login-link"]')).toBeVisible()
})

test('/forgot-password submission posts /api/users/forgot-password and shows the sent pane', async ({
  page,
}) => {
  const email = uniqueEmail('fpw')
  await page.request.post(`${API_BASE}/users`, {
    data: { email, password: 'ForgotPass123!', name: 'FPW Test' },
    failOnStatusCode: false,
  })
  await page.goto(APP_BASE + '/forgot-password')
  const reqs = await captureNetwork(page, async () => {
    await page.locator('[data-mol-id="forgot-email"]').fill(email)
    await page.locator('[data-mol-id="forgot-submit"]').click()
    await expect(page.locator('[data-mol-id="forgot-sent"]')).toBeVisible({ timeout: 15_000 })
  })
  const call = reqs.find((r) => /\/api\/users\/forgot-password/.test(r.url) && r.method === 'POST')
  expect(call?.status).toBe(200)
})

test('/forgot-password submitting unknown email still 200s (no enumeration)', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  const reqs = await captureNetwork(page, async () => {
    await page.locator('[data-mol-id="forgot-email"]').fill(`ghost+${Date.now()}@example.test`)
    await page.locator('[data-mol-id="forgot-submit"]').click()
    await expect(page.locator('[data-mol-id="forgot-sent"]')).toBeVisible({ timeout: 15_000 })
  })
  const call = reqs.find((r) => /\/api\/users\/forgot-password/.test(r.url) && r.method === 'POST')
  expect(call?.status).toBe(200)
})

test('/forgot-password "Back to sign in" link routes to /login', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  await page.locator('[data-mol-id="forgot-login-link"]').click()
  await page.waitForURL(/\/login/)
})

test('/forgot-password sent-pane Back to sign in routes to /login', async ({ page }) => {
  const email = uniqueEmail('fpw-back')
  await page.request.post(`${API_BASE}/users`, {
    data: { email, password: 'BackPass123!', name: 'BackLinkUser' },
    failOnStatusCode: false,
  })
  await page.goto(APP_BASE + '/forgot-password')
  await page.locator('[data-mol-id="forgot-email"]').fill(email)
  await page.locator('[data-mol-id="forgot-submit"]').click()
  await expect(page.locator('[data-mol-id="forgot-sent"]')).toBeVisible({ timeout: 15_000 })
  await page.locator('[data-mol-id="forgot-back-link"]').click()
  await page.waitForURL(/\/login/, { timeout: 8_000 })
})

test('/forgot-password email field accepts free-text and persists value', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  const email = `typed+${Date.now()}@flagship.test`
  await page.locator('[data-mol-id="forgot-email"]').fill(email)
  await expect(page.locator('[data-mol-id="forgot-email"]')).toHaveValue(email)
})
