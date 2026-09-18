/**
 * Per-page spec for /signup. Public.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getAccessToken, uniqueEmail } from './_helpers.js'

test('GET /signup renders name + email + password fields and a create-account button', async ({
  page,
}) => {
  await page.goto(APP_BASE + '/signup')
  await expect(page.locator('input#name')).toBeVisible()
  await expect(page.locator('input#email')).toBeVisible()
  await expect(page.locator('input#password')).toBeVisible()
  await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()
})

test('Submitting signup posts to /api/users and redirects to /inbox with a token', async ({
  page,
}) => {
  await page.goto(APP_BASE + '/signup')
  const reqs = await captureNetwork(page, async () => {
    await page.locator('input#name').fill('Spec User')
    await page.locator('input#email').fill(uniqueEmail('signup'))
    await page.locator('input#password').fill('TestPass123!')
    await page.getByRole('button', { name: /create account/i }).click()
    await expect(page).toHaveURL(/\/inbox/, { timeout: 15_000 })
  })
  expect(
    reqs.some(
      (r) =>
        /\/api\/users$/.test(r.url) && r.method === 'POST' && r.status >= 200 && r.status < 300,
    ),
  ).toBe(true)
  const accessToken = await getAccessToken(page)
  expect(accessToken).toBeTruthy()
})

test('sign-in link navigates back to /login', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  await page
    .getByRole('link', { name: /sign\s*in|log\s*in/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/login/)
})

test('Each input accepts text', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input#name').fill('Field Test')
  await expect(page.locator('input#name')).toHaveValue('Field Test')
  await page.locator('input#email').fill('field@flagship.test')
  await expect(page.locator('input#email')).toHaveValue('field@flagship.test')
  await page.locator('input#password').fill('SuperSecret!')
  await expect(page.locator('input#password')).toHaveValue('SuperSecret!')
})

test('Duplicate-email signup is rejected', async ({ page }) => {
  const dup = `dup-${Date.now()}@flagship.test`
  // First signup succeeds
  await page.goto(APP_BASE + '/signup')
  await page.locator('input#name').fill('First')
  await page.locator('input#email').fill(dup)
  await page.locator('input#password').fill('TestPass123!')
  await page.getByRole('button', { name: /create account/i }).click()
  await expect(page).toHaveURL(/\/inbox/, { timeout: 15_000 })

  // Sign out by clearing cookies and try again with same email
  await page.context().clearCookies()
  await page.goto(APP_BASE + '/signup')
  await page.locator('input#name').fill('Second')
  await page.locator('input#email').fill(dup)
  await page.locator('input#password').fill('TestPass123!')
  await page.getByRole('button', { name: /create account/i }).click()
  // should NOT redirect to /inbox — should stay on /signup with an error
  await page.waitForTimeout(2000)
  await expect(page).toHaveURL(/\/signup/)
})
