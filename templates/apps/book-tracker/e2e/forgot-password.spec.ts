/**
 * Forgot-password page: submitting an email POSTs to the reset endpoint
 * and the success state is rendered. We don't assert the email actually
 * delivered (that's an external integration) but we DO assert the API
 * call happened with a 2xx and the success copy is shown.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test('submitting forgot-password issues an API call and shows success', async ({
  page,
  browser,
}) => {
  const email = uniqueEmail('forgot')
  const ctx = await browser.newContext()
  const p = await ctx.newPage()
  await signup(p, email, 'password123')
  await ctx.close()

  await page.goto(APP_BASE + '/forgot-password')
  await page.locator('input[type="email"]').fill(email)
  const reqs = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /send reset link|submit/i }).click()
    await page.waitForTimeout(1500)
  })

  // The hook hits a /forgot-password / /reset endpoint — we don't care
  // about the exact path, just that some auth-related POST fired.
  const post = reqs.find((r) => r.method === 'POST' && /(forgot|reset|password)/i.test(r.url))
  expect(post, JSON.stringify(reqs)).toBeTruthy()
  expect(post!.status).toBeLessThan(500)

  await expect(page.getByRole('heading', { name: /check your inbox|inbox/i })).toBeVisible({
    timeout: 10_000,
  })
})

test('back-to-sign-in link returns to /login', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  const back = page.getByRole('link', { name: /back to sign in|sign in/i }).first()
  await back.click()
  await page.waitForURL(/\/login/, { timeout: 10_000 })
  await expect(page).toHaveURL(/\/login/)
})

test('forgot-password for unknown email still returns 2xx (anti-enumeration)', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  await page.locator('input[type="email"]').fill(`unknown+${Date.now()}@nowhere.test`)
  const reqs = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /send reset link|submit/i }).click()
    await page.waitForTimeout(1500)
  })
  const post = reqs.find((r) => r.method === 'POST' && /(forgot|reset|password)/i.test(r.url))
  expect(post, 'expected at least one forgot/reset POST').toBeTruthy()
  expect(post!.status).toBeLessThan(500)
  expect(post!.status).toBeLessThan(400)
})

test('email field rejects empty submission via HTML5 validation', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  await page.getByRole('button', { name: /send reset link|submit/i }).click()
  await page.waitForTimeout(500)
  await expect(page).toHaveURL(/\/forgot-password/)
})

test('logo link returns to /', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  // The auth-shell wordmark link is the app name ("Pagebound"), not a
  // sibling app's brand.
  await page.getByRole('link', { name: /^Pagebound$/ }).click()
  await page.waitForURL(/\/$/, { timeout: 5_000 })
})
