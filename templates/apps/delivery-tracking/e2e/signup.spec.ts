import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  captureNetwork,
  getAccessToken,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('/signup', () => {
  test('renders the signup form fields', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.getByLabel(/^Name$/i)).toBeVisible()
    await expect(page.getByLabel(/Email Address/i)).toBeVisible()
    await expect(page.getByLabel(/^Password$/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Create Account/i })).toBeVisible()
  })

  test('Create Account POSTs to /api/users and redirects to /dashboard', async ({ page }) => {
    const email = uniqueEmail('signup-redirect')
    await page.goto(APP_BASE + '/signup')
    await page.getByLabel(/^Name$/i).fill('Operator A')
    await page.getByLabel(/Email Address/i).fill(email)
    await page.getByLabel(/^Password$/i).fill('TestPass123!')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Create Account/i }).click()
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
    })
    const usersPost = reqs.find((r) => r.method === 'POST' && /\/api\/users(?:\?|$)/.test(r.url))
    expect(usersPost?.status, 'POST /api/users must succeed').toBeGreaterThanOrEqual(200)
    expect(usersPost?.status).toBeLessThan(300)
  })

  test('signed-up user is recognised on the dashboard (read-after-write)', async ({ page }) => {
    const { email } = await signup(page)
    // Fetch /api/users/me to confirm the signed-up user is recognised.
    const token = await getAccessToken(page)
    const meResp = await page.request.get(`${API_BASE}/users/me`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    expect(meResp.status(), 'GET /api/users/me should succeed').toBe(200)
    const body = (await meResp.json()) as {
      props?: { email?: string }
      data?: { props?: { email?: string }; email?: string }
      email?: string
    }
    const emailFromResp =
      body?.props?.email ?? body?.data?.props?.email ?? body?.data?.email ?? body?.email ?? null
    expect(emailFromResp?.toLowerCase()).toBe(email.toLowerCase())
  })

  test('hidden password is masked by default; toggle reveals it', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const pw = page.getByLabel(/^Password$/i)
    await pw.fill('SuperSecret1!')
    await expect(pw).toHaveAttribute('type', 'password')
    await page.getByRole('button', { name: /Show password/i }).click()
    await expect(pw).toHaveAttribute('type', 'text')
  })

  test('"Sign In" link in the footer goes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.getByRole('link', { name: /^Sign In$/i }).click()
    await expect(page).toHaveURL(/\/login$/)
  })
})
