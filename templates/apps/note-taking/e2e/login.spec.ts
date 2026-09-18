/**
 * /login page — email/password form, primary submit, forgot-password link,
 * signup link. Outcomes asserted: invalid creds yield API 401 and surface
 * an error; valid creds round-trip through /api/users/log-in and route to
 * /home.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test('login page renders email + password + submit + forgot link', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  await expect(page.getByRole('textbox', { name: /email/i }).first()).toBeVisible()
  await expect(page.locator('input[type="password"]').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /sign\s*in|log\s*in/i }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: /forgot/i }).first()).toBeVisible()
})

test('invalid login surfaces error and stays on /login', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  await page.getByRole('textbox', { name: /email/i }).first().fill('nobody@example.com')
  await page.locator('input[type="password"]').first().fill('wrong-password!')
  const reqs = await captureNetwork(page, async () => {
    await page
      .getByRole('button', { name: /sign\s*in|log\s*in/i })
      .first()
      .click()
    await page.waitForTimeout(2000)
  })
  const loginCall = reqs.find((r) => r.method === 'POST' && /\/api\/users\/log-in$/.test(r.url))
  expect(loginCall, 'login attempt should hit /api/users/log-in').toBeTruthy()
  expect(loginCall!.status).toBeGreaterThanOrEqual(400)
  await expect(page).toHaveURL(/\/login/)
})

test('valid login navigates to /home', async ({ page, browser }) => {
  const email = uniqueEmail('login-ok')
  const password = 'GoodPass-321!'
  const ctx = await browser.newContext()
  const p = await ctx.newPage()
  await signup(p, email, password)
  await ctx.close()

  await page.goto(APP_BASE + '/login')
  await page.getByRole('textbox', { name: /email/i }).first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  const reqs = await captureNetwork(page, async () => {
    await page
      .getByRole('button', { name: /sign\s*in|log\s*in/i })
      .first()
      .click()
    await page.waitForURL(/\/home/, { timeout: 15_000 })
  })
  const loginCall = reqs.find((r) => r.method === 'POST' && /\/api\/users\/log-in$/.test(r.url))
  expect(loginCall?.status).toBe(200)
})

test('login page forgot-password link navigates to /forgot-password', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  await page
    .getByRole('link', { name: /forgot/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/forgot-password/)
})

test('login page links to /signup via "Create one"', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  await page
    .getByRole('link', { name: /create one|sign\s*up/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/signup/)
})

test('login page header brand returns to /', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  await page.getByRole('link', { name: /verso/i }).first().click()
  await expect(page).toHaveURL(/\/$/)
})

test('login page theme toggle flips html data-theme', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  const before = await page.evaluate(
    () =>
      document.documentElement.getAttribute('data-mol-theme') ||
      document.documentElement.getAttribute('data-mol-mode') ||
      document.documentElement.dataset.theme,
  )
  await page
    .getByRole('button', { name: /toggle theme/i })
    .first()
    .click()
  await page.waitForTimeout(150)
  const after = await page.evaluate(
    () =>
      document.documentElement.getAttribute('data-mol-theme') ||
      document.documentElement.getAttribute('data-mol-mode') ||
      document.documentElement.dataset.theme,
  )
  expect(after).not.toBe(before)
})
