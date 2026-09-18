/**
 * /login — credential login. Verifies UI, redirect on success, error
 * surface on bad credentials, and link routing to /signup and
 * /forgot-password.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test('/login renders email + password fields plus submit button', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  await expect(page.locator('[data-mol-id="login-email"]')).toBeVisible()
  await expect(page.locator('[data-mol-id="login-password"]')).toBeVisible()
  await expect(page.locator('[data-mol-id="login-submit"]')).toBeVisible()
})

test('/login successful submission goes to /dashboard with /api/users/log-in 200', async ({
  page,
}) => {
  const email = uniqueEmail('login')
  const password = 'LoginPass123!'
  const create = await page.request.post(`${API_BASE}/users`, {
    data: { email, password, name: 'Login Test' },
    failOnStatusCode: false,
  })
  expect(create.status()).toBe(201)

  await page.goto(APP_BASE + '/login')
  const reqs = await captureNetwork(page, async () => {
    await page.locator('[data-mol-id="login-email"]').fill(email)
    await page.locator('[data-mol-id="login-password"]').fill(password)
    await page.locator('[data-mol-id="login-submit"]').click()
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 })
  })
  expect(reqs.find((r) => /\/api\/users\/log-in/.test(r.url))?.status).toBe(200)
})

test('/login with wrong password shows the inline error and stays put', async ({ page }) => {
  const email = uniqueEmail('badpass')
  await page.request.post(`${API_BASE}/users`, {
    data: { email, password: 'GoodPass123!', name: 'Bad Pass Test' },
    failOnStatusCode: false,
  })
  await page.goto(APP_BASE + '/login')
  await page.locator('[data-mol-id="login-email"]').fill(email)
  await page.locator('[data-mol-id="login-password"]').fill('WrongPass!')
  await page.locator('[data-mol-id="login-submit"]').click()
  await expect(page.locator('[data-mol-id="login-error"]')).toBeVisible({ timeout: 8_000 })
  expect(new URL(page.url()).pathname).toContain('/login')
})

test('/login forgot-password link routes to /forgot-password', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  await page.locator('[data-mol-id="login-forgot-link"]').click()
  await page.waitForURL(/\/forgot-password/)
})

test('/login signup link routes to /signup', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  await page.locator('[data-mol-id="login-signup-link"]').click()
  await page.waitForURL(/\/signup/)
})

test('/login show-password toggle flips input between password and text', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  const pwd = page.locator('[data-mol-id="login-password"]')
  await expect(pwd).toHaveAttribute('type', 'password')
  await page.locator('[data-mol-id="login-toggle-password"]').click()
  await expect(pwd).toHaveAttribute('type', 'text')
})

test('/login email input accepts text and persists value', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  const email = uniqueEmail('typecheck')
  await page.locator('[data-mol-id="login-email"]').fill(email)
  await expect(page.locator('[data-mol-id="login-email"]')).toHaveValue(email)
})
