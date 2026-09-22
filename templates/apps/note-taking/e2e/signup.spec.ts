/**
 * /signup page — VersoInput name/email/password fields, primary submit,
 * "Sign in" link, OAuth buttons. Outcome asserted: form submission hits
 * POST /api/users and routes to /home on success.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test('signup page renders all required fields', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  await expect(page.getByRole('textbox', { name: /display name|name/i }).first()).toBeVisible()
  await expect(page.getByRole('textbox', { name: /email/i }).first()).toBeVisible()
  await expect(page.locator('input[type="password"]').first()).toBeVisible()
  await expect(
    page.getByRole('button', { name: /create my notebook|create.*account|sign.*up/i }).first(),
  ).toBeVisible()
})

test('signup redirects to /home and the API rejects duplicate emails', async ({ page }) => {
  // The duplicate-email 4xx is the test's premise; the browser logs it as a
  // console error, which the auto-attached console guard would otherwise
  // fail the test for.
  test.info().annotations.push({
    type: 'allow-console-error',
    description: 'status of 4[0-9][0-9]',
  })
  const email = uniqueEmail('signup-dup')
  const password = 'TestPass123!'
  await page.goto(APP_BASE + '/signup')
  await page.getByRole('textbox', { name: /email/i }).first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  const reqs = await captureNetwork(page, async () => {
    await page
      .getByRole('button', { name: /create my notebook|create.*account/i })
      .first()
      .click()
    await page.waitForURL(/\/home/, { timeout: 15_000 })
  })
  const userPost = reqs.find((r) => r.method === 'POST' && /\/api\/users(\?|$)/.test(r.url))
  expect(userPost?.status).toBeLessThan(300)

  // Re-submit with same email — must not silently double-create.
  await page.goto(APP_BASE + '/signup')
  await page.getByRole('textbox', { name: /email/i }).first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  const dup = await captureNetwork(page, async () => {
    await page
      .getByRole('button', { name: /create my notebook|create.*account/i })
      .first()
      .click()
    await page.waitForTimeout(2000)
  })
  const second = dup.find((r) => r.method === 'POST' && /\/api\/users(\?|$)/.test(r.url))
  expect(second?.status).toBeGreaterThanOrEqual(400)
})

test('signup links to /login', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  await page
    .getByRole('link', { name: /sign in|already.*account|login/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/login/)
})

test('signup header brand link returns to /', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  await page.getByRole('link', { name: /verso/i }).first().click()
  await expect(page).toHaveURL(/\/$/)
})

test('signup display-name field accepts input', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  const name = page.getByRole('textbox', { name: /display name|name/i }).first()
  await name.fill('Sara Chen')
  await expect(name).toHaveValue('Sara Chen')
})

test('signup sets auth cookie and /api/profile/me returns the new user', async ({ page }) => {
  const email = uniqueEmail('signup-token')
  await page.goto(APP_BASE + '/signup')
  await page
    .getByRole('textbox', { name: /display name|name/i })
    .first()
    .fill('Token Tester')
  await page.getByRole('textbox', { name: /email/i }).first().fill(email)
  await page.locator('input[type="password"]').first().fill('TestPass123!')
  await page
    .getByRole('button', { name: /create my notebook|create.*account/i })
    .first()
    .click()
  await page.waitForURL(/\/home/, { timeout: 15_000 })

  // Verify auth cookie was set (httpOnly token cookie set by server after signup).
  const cookies = await page.context().cookies()
  const hasAuthCookie = cookies.some((c) => c.name === 'token' && c.value.length > 0)
  expect(hasAuthCookie, 'auth cookie must be set after signup').toBe(true)

  // Verify the authenticated user matches the signed-up email.
  const meRes = await page.request.get('/api/profile/me')
  expect(meRes.status()).toBe(200)
  const body = await meRes.json()
  expect(body?.email).toBe(email)
})

test('signup theme toggle persists across reload', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
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
  await page.reload()
  const persisted = await page.evaluate(
    () =>
      document.documentElement.getAttribute('data-mol-theme') ||
      document.documentElement.getAttribute('data-mol-mode') ||
      document.documentElement.dataset.theme,
  )
  expect(persisted).toBe(after)
})
