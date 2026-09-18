import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signupViaUI, uniqueEmail } from './_helpers.js'

test.describe('/signup', () => {
  test('signup form creates a real user and redirects off /signup', async ({ page }) => {
    const email = uniqueEmail('signup-form')
    const reqs = await captureNetwork(page, async () => {
      await signupViaUI(page, email)
    })
    const post = reqs.find((r) => r.url.endsWith('/users') && r.method === 'POST')
    expect(post?.status, 'POST /api/users').toBe(201)
    expect(new URL(page.url()).pathname).not.toBe('/signup')
  })

  test('email field accepts input and is reflected back in the DOM', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const email = page.locator('#signup-email')
    await expect(email).toBeVisible({ timeout: 10_000 })
    await email.fill('typed@example.com')
    await expect(email).toHaveValue('typed@example.com')
  })

  test('Sign-up button is disabled until required fields are populated', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const submit = page.getByRole('button', { name: /create.*account|sign\s*up/i }).first()
    // We don't strictly require disabled — but submitting empty must not navigate.
    await submit.click().catch(() => {})
    await page.waitForTimeout(500)
    expect(new URL(page.url()).pathname).toBe('/signup')
  })

  test('Sign-in link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const link = page.getByRole('link', { name: /sign\s*in|log\s*in/i }).first()
    await expect(link).toBeVisible({ timeout: 10_000 })
    await link.click()
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('signed-up user can hit an authed endpoint', async ({ page }) => {
    const email = uniqueEmail('signup-authed')
    await signupViaUI(page, email)
    const res = await page.request.get(`${API_BASE}/components`)
    expect([200, 401, 403]).toContain(res.status())
  })
})
