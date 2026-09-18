import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/forgot-password', () => {
  test('renders the forgot-password form', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.getByRole('heading', { name: /Reset your password/i })).toBeVisible()
    await expect(page.getByLabel(/Email Address/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Send Reset Link/i })).toBeVisible()
  })

  test('submitting fires POST to the password-reset endpoint and shows confirmation', async ({
    page,
  }) => {
    const { email } = await signup(page)
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByLabel(/Email Address/i).fill(email)
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Send Reset Link/i }).click()
      await expect(page.getByRole('heading', { name: /Check your email/i })).toBeVisible({
        timeout: 15_000,
      })
    })
    const resetReq = reqs.find(
      (r) => r.method === 'POST' && /password-reset|forgot|reset/i.test(r.url),
    )
    expect(resetReq).toBeTruthy()
    expect(resetReq?.status).toBeGreaterThanOrEqual(200)
    expect(resetReq?.status).toBeLessThan(400)
  })

  test('"Back to sign in" returns to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByLabel(/Email Address/i).fill('test@parcel.test')
    await page.getByRole('button', { name: /Send Reset Link/i }).click()
    await expect(page.getByRole('heading', { name: /Check your email/i })).toBeVisible({
      timeout: 15_000,
    })
    await page.getByRole('button', { name: /Back to sign in/i }).click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('submitting empty email keeps the form on /forgot-password (browser required)', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Send Reset Link/i }).click()
      await page.waitForTimeout(500)
    })
    // No POST should have fired (browser blocks the submit because the
    // <input type="email" required> is empty).
    const resetReq = reqs.find(
      (r) => r.method === 'POST' && /password-reset|forgot|reset/i.test(r.url),
    )
    expect(resetReq, 'empty submit must not POST').toBeFalsy()
    await expect(page).toHaveURL(/\/forgot-password/)
  })
})
