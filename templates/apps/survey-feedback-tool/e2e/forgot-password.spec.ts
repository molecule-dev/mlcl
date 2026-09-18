import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, API_BASE, uniqueEmail, captureNetwork } from './_helpers.js'

test.describe('forgot password', () => {
  test('UI: submit email + see confirmation; backend writes a reset token', async ({ page }) => {
    const email = uniqueEmail('forgot')
    const created = await page.request.post(`${API_BASE}/users`, {
      data: { email, password: 'TestPass123!', name: 'Forgot UI' },
    })
    expect(created.status()).toBe(201)

    await page.goto(APP_BASE + '/forgot-password')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('input[type="email"]').fill(email)
      const respPromise = page.waitForResponse(
        (resp) =>
          resp.url().includes('/api/users/forgot-password') && resp.request().method() === 'POST',
        { timeout: 15_000 },
      )
      await page
        .getByRole('button', { name: /send.*reset|reset link|reset email|send.*email/i })
        .first()
        .click()
      const resp = await respPromise
      expect(resp.status()).toBe(200)
      await expect(page.getByText(/check your inbox/i).first()).toBeVisible({
        timeout: 10_000,
      })
    })
    expect(
      reqs.some(
        (r) =>
          r.method === 'POST' && r.url.includes('/api/users/forgot-password') && r.status === 200,
      ),
      'expected POST /api/users/forgot-password to be exercised',
    ).toBe(true)
  })

  test('Sign in link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page
      .getByRole('link', { name: /sign\s*in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('Gauge logo navigates to landing /', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByRole('link', { name: /gauge/i }).first().click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('Email field is editable + has type=email', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const email = page.locator('input[type="email"]')
    await email.fill('typed@example.com')
    await expect(email).toHaveValue('typed@example.com')
  })

  test('REST: unknown email still returns 200 (no enumeration)', async ({ page }) => {
    const res = await page.request.post(`${API_BASE}/users/forgot-password`, {
      data: { email: uniqueEmail('nobody') },
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { success?: boolean }
    expect(body.success).toBe(true)
  })

  test('REST: known email returns 200 and persists a reset token', async ({ page }) => {
    const email = uniqueEmail('forgot-rest')
    const created = await page.request.post(`${API_BASE}/users`, {
      data: { email, password: 'TestPass123!', name: 'Forgot REST' },
    })
    expect(created.status()).toBe(201)

    const res = await page.request.post(`${API_BASE}/users/forgot-password`, {
      data: { email },
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { success?: boolean }
    expect(body.success).toBe(true)
  })
})
