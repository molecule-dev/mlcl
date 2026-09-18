import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/signup', () => {
  test('full-name field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const name = page.locator('[data-mol-id="signup-name"]')
    await name.fill('Aria Lin')
    await expect(name).toHaveValue('Aria Lin')
  })

  test('email field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const tb = page.locator('[data-mol-id="signup-email"]')
    await tb.fill('a@b.com')
    await expect(tb).toHaveValue('a@b.com')
  })

  test('password field accepts input and respects minLength', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const pw = page.locator('[data-mol-id="signup-password"]')
    await expect(pw).toHaveAttribute('minlength', '8')
    await pw.fill('LongEnoughPass1!')
    await expect(pw).toHaveValue('LongEnoughPass1!')
  })

  test('"Sign in" link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('[data-mol-id="signup-login-link"]').click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('Submitting registers a user and lands on /files', async ({ page }) => {
    const email = uniqueEmail('signup')
    const reqs = await captureNetwork(page, async () => {
      await signup(page, email)
    })
    expect(page.url()).toMatch(/\/files/)
    expect(
      reqs.some((r) => /\/api\/users(?!\/)/.test(r.url) && r.method === 'POST' && r.status === 201),
    ).toBeTruthy()
  })

  test('After signup, the API recognizes us as authenticated (cookie carries through)', async ({
    page,
  }) => {
    await signup(page)
    const status = await page.evaluate(async () => {
      const res = await fetch('/api/billing/status', { credentials: 'include' })
      return { ok: res.ok, body: await res.json() }
    })
    expect(status.ok).toBe(true)
    expect(status.body).toMatchObject({ planKey: 'free' })
  })
})
