import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/reset-password', () => {
  test('renders the new-password + confirm-password fields and submit', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=fake&email=test@example.com')
    await expect(page.locator('input[type="password"]').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('input[type="password"]').nth(1)).toBeVisible()
    await expect(
      page.getByRole('button', { name: /reset|confirm|update|set.*password/i }).first(),
    ).toBeVisible()
  })

  test('Back-to-sign-in link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page
      .getByRole('link', { name: /back|sign in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 })
  })

  test('Mismatched passwords block submission (no POST fires)', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=fake&email=test@example.com')
    await page.locator('input[type="password"]').first().fill('NewPass123!')
    await page.locator('input[type="password"]').nth(1).fill('Different!')
    let posted = false
    page.on('request', (req) => {
      if (req.method() === 'POST' && /reset|confirm/i.test(req.url())) posted = true
    })
    // The submit button is disabled while passwords mismatch — that IS the
    // outcome we're asserting: zero POST is possible. Try a force click to
    // confirm even bypassing the disabled state still doesn't fire a POST
    // (because the form's onSubmit also guards the same condition).
    const btn = page.getByRole('button', { name: /reset|confirm|update|set.*password/i }).first()
    await expect(btn).toBeDisabled()
    await btn.click({ force: true }).catch(() => {})
    await page.waitForTimeout(500)
    expect(posted, 'mismatched passwords must not POST').toBe(false)
  })

  test('Submit with an invalid token fails gracefully (4xx — never 5xx)', async ({ page }) => {
    // The expected 4xx (401 on a bad token) is the contract under test —
    // not a page bug — so the console-guard must not fail on it.
    test
      .info()
      .annotations.push({ type: 'allow-console-error', description: 'status of 4[0-9][0-9]' })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/reset-password?token=invalid-token-xyz&email=test@example.com')
      await page.locator('input[type="password"]').first().fill('NewPass123!')
      await page.locator('input[type="password"]').nth(1).fill('NewPass123!')
      const submit = page
        .getByRole('button', { name: /reset|confirm|update|set.*password/i })
        .first()
      const respPromise = page.waitForResponse(
        (r) => /reset|confirm/i.test(r.url()) && r.request().method() === 'POST',
        { timeout: 10_000 },
      )
      await submit.click()
      const resp = await respPromise.catch(() => null)
      if (resp) {
        // Bad token → 400/401/404, not 500.
        expect(resp.status()).toBeLessThan(500)
      }
    })
    expect(reqs.some((r) => /reset|confirm/i.test(r.url) && r.method === 'POST')).toBe(true)
  })
})
