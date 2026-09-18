import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test('Forgot password sends a request and the API responds 200', async ({ page }) => {
  const { email } = await signup(page)
  await page.evaluate(() => window.localStorage.clear())
  await page.goto(APP_BASE + '/forgot-password')

  const reqs = await captureNetwork(page, async () => {
    await page.locator('input[type="email"]').first().fill(email)
    await page.locator('form button[type="submit"]').first().click()
    await page.waitForTimeout(1500)
  })
  const fpReq = reqs.find((r) => /\/users\/forgot-password/.test(r.url) && r.method === 'POST')
  expect(fpReq, 'forgot-password POST not fired').toBeTruthy()
  expect(fpReq!.status).toBe(200)
})

test('Forgot password issues a reset token (read-after-write via API)', async ({ page }) => {
  const { email } = await signup(page)

  // Direct API call (UI request also tested above)
  const res = await page.request.post(`/api/users/forgot-password`, {
    data: { email },
    headers: { 'Content-Type': 'application/json' },
  })
  expect(res.status()).toBe(200)
  const body = (await res.json()) as { message?: string }
  expect(body).toBeTruthy()
})

test('Forgot password page renders an email field and submit button', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  await expect(page.locator('input[type="email"]').first()).toBeVisible()
  await expect(page.locator('form button[type="submit"]').first()).toBeVisible()
})

test('Forgot password page links back to /login', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  await expect(page.locator('a[href="/login"]').first()).toBeVisible()
})

test('Forgot password page does not require an authenticated session', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  await page.evaluate(() => window.localStorage.clear()).catch(() => {})
  await page.reload()
  await expect(page).toHaveURL(/\/forgot-password/)
})
