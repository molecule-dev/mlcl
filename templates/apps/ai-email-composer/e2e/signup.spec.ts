import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test('signup → dashboard, profile API returns the new user', async ({ page }) => {
  const reqs = await captureNetwork(page, async () => {
    await signup(page)
  })
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

  const userPost = reqs.find((r) => r.method === 'POST' && /\/api\/users(\?|$)/.test(r.url))
  expect(userPost, 'POST /api/users must have happened').toBeTruthy()
  expect(userPost!.status).toBeGreaterThanOrEqual(200)
  expect(userPost!.status).toBeLessThan(300)

  // Auth state must survive a hard reload.
  await page.reload()
  await expect(page).toHaveURL(/\/dashboard/)
})

test('signup with duplicate email surfaces an error', async ({ page, browser }) => {
  const email = uniqueEmail('dup')
  const password = 'TestPass123!'

  const ctx1 = await browser.newContext()
  const p1 = await ctx1.newPage()
  await signup(p1, email, password)
  await ctx1.close()

  await page.goto(APP_BASE + '/signup')
  await page.locator('input#name, input[name="name"]').first().fill('Test User')
  await page.locator('input[type="email"], input#email').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  // The duplicate signup is EXPECTED to be rejected with a 403 — the
  // browser logs that failed request to console; tell the console guard.
  test.info().annotations.push({
    type: 'allow-console-error',
    description: /status of 403/,
  })
  await page
    .getByRole('button', { name: /create account|sign\s*up/i })
    .first()
    .click()

  // The error must SURFACE: an inline alert, and the user stays on /signup.
  await expect(page.locator('[data-mol-id="signup-error"]')).toBeVisible({ timeout: 15_000 })
  await expect(page).toHaveURL(/\/signup/)
})

test('signup form exposes name, email, and password inputs plus a submit button', async ({
  page,
}) => {
  await page.goto(APP_BASE + '/signup')
  await expect(page.locator('input#name, input[name="name"]').first()).toBeVisible()
  await expect(page.locator('input[type="email"], input#email').first()).toBeVisible()
  await expect(page.locator('input[type="password"]').first()).toBeVisible()
  await expect(
    page.getByRole('button', { name: /create account|sign\s*up|get\s*started/i }).first(),
  ).toBeVisible()
})
