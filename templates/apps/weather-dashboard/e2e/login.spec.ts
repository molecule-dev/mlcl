import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test('Login form renders email and password inputs', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  await expect(page.locator('input[type="email"]')).toBeVisible()
  await expect(page.locator('input[type="password"]')).toBeVisible()
})

test('Login with a known account routes off /login', async ({ page }) => {
  const { email, password } = await signup(page, uniqueEmail('login-known'))
  await page.evaluate(() => window.localStorage.clear())
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  const reqs = await captureNetwork(page, async () => {
    await page
      .getByRole('button', { name: /log\s*in|sign\s*in/i })
      .first()
      .click()
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 })
  })
  const post = reqs.find((r) => r.method === 'POST' && /\/api\/users\/log-in/.test(r.url))
  expect(post).toBeDefined()
  expect(post!.status).toBeLessThan(300)
})

test('Login with bad credentials returns non-2xx and stays on /login', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').fill('definitely-not-real@example.com')
  await page.locator('input[type="password"]').fill('WrongPass987!')
  const reqs = await captureNetwork(page, async () => {
    await page
      .getByRole('button', { name: /log\s*in|sign\s*in/i })
      .first()
      .click()
    await page.waitForTimeout(2000)
  })
  const post = reqs.find((r) => r.method === 'POST' && /\/api\/users\/log-in/.test(r.url))
  expect(post).toBeDefined()
  expect(post!.status).toBeGreaterThanOrEqual(400)
  await expect(page).toHaveURL(/\/login/)
})

test('Login page exposes "Forgot password" that navigates to /forgot-password', async ({
  page,
}) => {
  // The UI renders Forgot password as a <button> that calls navigate(),
  // not an <a> — clicking it must still route to /forgot-password.
  await page.goto(APP_BASE + '/login')
  await page
    .getByRole('button', { name: /forgot/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/forgot-password/, { timeout: 10_000 })
})
