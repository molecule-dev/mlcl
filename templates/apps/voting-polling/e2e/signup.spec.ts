import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, captureNetwork, getAccessToken, signup, uniqueEmail } from './_helpers.js'

test('Signup form renders all four required inputs', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  await expect(page.locator('input#name')).toBeVisible()
  await expect(page.locator('input#organization')).toBeVisible()
  await expect(page.locator('input#email')).toBeVisible()
  await expect(page.locator('input#password')).toBeVisible()
})

test('Signup form has a "Create organization" submit button', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  await expect(page.getByRole('button', { name: /create\s*organization/i }).first()).toBeVisible()
})

test('Submitting valid signup creates a user, persists token, and routes to /dashboard', async ({
  page,
}) => {
  await page.goto(APP_BASE + '/signup')
  const email = uniqueEmail('signup')
  const reqs = await captureNetwork(page, async () => {
    await page.locator('input#name').fill('Test User')
    await page.locator('input#organization').fill('Test Org')
    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill('TestPass123456!')
    await page.getByRole('button', { name: /create\s*organization/i }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })
  })
  const create = reqs.find((r) => r.method === 'POST' && /\/api\/users\b/.test(r.url))
  expect(create?.status, 'POST /api/users').toBeLessThan(300)
  expect(await getAccessToken(page)).toBeTruthy()

  // Read-after-write: GET /api/profile/me should return the user we just created.
  const me = await api<{ email: string; id: string }>(page, 'GET', '/profile/me')
  expect(me.email).toBe(email)
})

test('Signup typed values are reflected in the form fields (controlled inputs)', async ({
  page,
}) => {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input#name').fill('Jane Doe')
  await page.locator('input#email').fill('jane@example.com')
  await expect(page.locator('input#name')).toHaveValue('Jane Doe')
  await expect(page.locator('input#email')).toHaveValue('jane@example.com')
})

test('After signup, the user reaches /dashboard and sees the Quorum Control Room title', async ({
  page,
}) => {
  await signup(page)
  await expect(page.getByRole('heading', { name: /quorum control room/i })).toBeVisible()
})
