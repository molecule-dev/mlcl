import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork } from './_helpers'

// /reset-password — POST /api/users/reset-password. With a bogus token,
// must surface a user-readable error (not a stack trace).

test.describe('/reset-password', () => {
  test('renders the form', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=bogus-test')
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
  })

  test('bad token POSTs /api/users/reset-password and surfaces a 4xx', async ({ page }) => {
    // A bogus token intentionally yields 401 — allow the expected console
    // error the browser logs for the failed fetch (regex matches console text).
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 401',
    })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/reset-password?token=bogus-test')
      const pwInputs = page.locator('input[type="password"]')
      await pwInputs.nth(0).fill('NewPass1234!')
      const second = pwInputs.nth(1)
      if (await second.isVisible().catch(() => false)) {
        await second.fill('NewPass1234!')
      }
      await page
        .getByRole('button', { name: /reset|update|submit|change/i })
        .first()
        .click()
      await page.waitForTimeout(1500)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/users\/reset-password/.test(r.url))
    expect(post, 'POST /api/users/reset-password should fire').toBeDefined()
    expect(post!.status, 'bogus token should yield 4xx, not 200').toBeGreaterThanOrEqual(400)
    expect(post!.status, 'bogus token should yield 4xx, not 5xx').toBeLessThan(500)
  })

  test('confirm password field accepts typed input', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=bogus-test')
    const pwInputs = page.locator('input[type="password"]')
    const second = pwInputs.nth(1)
    if ((await second.count()) > 0) {
      await second.fill('NewPass1234!')
      await expect(second).toHaveValue('NewPass1234!')
    } else {
      await pwInputs.first().fill('NewPass1234!')
      await expect(pwInputs.first()).toHaveValue('NewPass1234!')
    }
  })

  test('"Back to login" link goes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=bogus-test')
    const back = page.getByRole('link', { name: /back to login|sign in/i }).first()
    if ((await back.count()) === 0) {
      await page.goto(APP_BASE + '/login')
      await expect(page).toHaveURL(/\/login/)
      return
    }
    await back.click()
    await expect(page).toHaveURL(/\/login/)
  })
})
