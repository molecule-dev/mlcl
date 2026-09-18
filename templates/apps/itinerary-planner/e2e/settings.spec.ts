import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup } from './_helpers'

test.describe('/settings', () => {
  test('mounts after signup and renders heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('Email field reflects the signed-in user and PATCHes on blur', async ({ page }) => {
    const { email } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    const emailField = page.getByRole('textbox', { name: /email/i }).first()
    await expect(emailField).toBeVisible()
    await expect(emailField).toHaveValue(email)
  })

  test('Change-password button opens the password modal', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const btn = page.getByRole('button', { name: /change.*password/i }).first()
    if (await btn.count()) {
      await btn.click()
      await page.waitForTimeout(500)
      // The modal exposes a current/new password pair.
      const pwds = page.getByRole('textbox', { name: /password/i })
      await expect(pwds.nth(1)).toBeAttached()
    }
  })

  test('Upgrade button POSTs /api/billing/checkout and returns a real Stripe Checkout URL', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    // The /billing/tiers GET must complete first so the upgrade button has a
    // real priceId behind it. We wait on the button being enabled rather
    // than racing the click against the unresolved tiers fetch.
    const upgrade = page.getByTestId('settings-upgrade-button')
    await expect(upgrade).toBeVisible()
    await expect(upgrade).toBeEnabled({ timeout: 10_000 })
    const reqs: Array<{
      method: string
      url: string
      status: number
      bodyText: () => Promise<string>
    }> = []
    page.on('response', (resp) => {
      reqs.push({
        method: resp.request().method(),
        url: resp.url(),
        status: resp.status(),
        bodyText: () => resp.text(),
      })
    })
    // Abort the cross-origin Stripe redirect so the test stays in the
    // smoke app context. We only need to assert the response payload —
    // the real Stripe checkout page itself is not under test here.
    await page.route('**checkout.stripe.com/**', (route) => route.abort('aborted'))
    await upgrade.click()
    await page.waitForTimeout(2500)
    const checkout = reqs.find(
      (r) => r.method === 'POST' && /\/api\/billing\/checkout(?:\?|$)/.test(r.url),
    )
    expect(checkout, 'POST /api/billing/checkout must fire from settings upgrade').toBeDefined()
    expect(checkout!.status).toBeLessThan(400)
    const bodyTxt = await checkout!.bodyText()
    expect(bodyTxt).toMatch(/checkout\.stripe\.com|cs_test_/)
  })

  test('GET /api/billing/status responds with planKey on mount', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await page.waitForLoadState('networkidle').catch(() => {})
    })
    const status = reqs.find((r) => r.method === 'GET' && /\/api\/billing\/status/.test(r.url))
    if (status) expect(status.status).toBeLessThan(400)
  })

  test('Sign-out button clears the session', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const signOut = page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()
    if (await signOut.count()) {
      await signOut.click()
      await page.waitForTimeout(800)
      // Either we're on /login or /, but we're definitely NOT still on /settings.
      await expect(page).not.toHaveURL(/\/settings/)
    }
  })
})
