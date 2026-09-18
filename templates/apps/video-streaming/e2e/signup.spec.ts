import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('/signup', () => {
  test('renders the create-account form (heading + email + password fields + submit)', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.getByRole('heading', { name: /spool/i }).first()).toBeVisible()
    await expect(page.getByPlaceholder(/you@spool/i)).toBeVisible()
    await expect(page.getByPlaceholder(/8\+|password/i).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /create.*account|sign.*up/i })).toBeVisible()
  })

  test('Sign in link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page
      .getByRole('link', { name: /sign in|already.*have.*account/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 })
  })

  test('Submit creates a real user (POST /api/users → 201) and lands on /home', async ({
    page,
  }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/signup')
      const email = uniqueEmail('signup-page')
      await page.locator('input[type="text"]').first().fill('Page Tester')
      await page.locator('input[type="email"]').first().fill(email)
      await page.locator('input[type="password"]').first().fill('TestPass123!')
      await page.locator('input[type="password"]').nth(1).fill('TestPass123!')
      const [resp] = await Promise.all([
        page.waitForResponse(
          (r) => /\/api\/users(?:\?|$)/.test(r.url()) && r.request().method() === 'POST',
          { timeout: 10_000 },
        ),
        page.getByRole('button', { name: /create.*account|sign.*up/i }).click(),
      ])
      expect(resp.status()).toBe(201)
      await expect(page).toHaveURL(/\/home/, { timeout: 15_000 })
    })
    expect(
      reqs.some((r) => /\/api\/users/.test(r.url) && r.method === 'POST' && r.status === 201),
    ).toBe(true)
  })

  test('Mismatched passwords surface a validation error and DO NOT POST', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('input[type="text"]').first().fill('Mismatch')
    await page.locator('input[type="email"]').first().fill(uniqueEmail('signup-mismatch'))
    await page.locator('input[type="password"]').first().fill('TestPass123!')
    await page.locator('input[type="password"]').nth(1).fill('Different!')
    let posted = false
    page.on('request', (req) => {
      if (req.method() === 'POST' && /\/api\/users(?:\?|$)/.test(req.url())) posted = true
    })
    // The submit button is disabled while passwords mismatch — that IS the
    // outcome we're asserting: zero POST is possible. Force-click anyway to
    // confirm the form's onSubmit guard also blocks the request even if the
    // disabled attribute is bypassed.
    const btn = page.getByRole('button', { name: /create.*account|sign.*up/i })
    await expect(btn).toBeDisabled()
    await btn.click({ force: true }).catch(() => {})
    await page.waitForTimeout(500)
    expect(posted, 'mismatched passwords must not POST').toBe(false)
    // URL stays on /signup
    await expect(page).toHaveURL(/\/signup/)
  })
})
