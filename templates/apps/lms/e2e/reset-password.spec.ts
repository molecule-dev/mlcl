import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/reset-password', () => {
  test('renders heading + both password fields + submit', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=demo')
    await expect(page.getByRole('heading', { name: /set new password/i })).toBeVisible()
    await expect(page.locator('input#password')).toBeVisible()
    await expect(page.locator('input#confirm-password')).toBeVisible()
    await expect(page.getByRole('button', { name: /reset password/i })).toBeVisible()
  })

  test('mismatched passwords show inline error and do not submit', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/reset-password?token=demo')
      await page.locator('input#password').fill('NewPass123!')
      await page.locator('input#confirm-password').fill('DifferentPass456!')
      await page
        .getByRole('button', { name: /reset password/i })
        .first()
        .click()
      await page.waitForTimeout(500)
    })
    await expect(page.getByRole('alert')).toContainText(/do not match/i)
    const post = reqs.find(
      (r) => r.method === 'POST' && /\/api\/users\/reset-password$/.test(r.url),
    )
    expect(post, 'no reset POST should fire on mismatch').toBeUndefined()
  })

  test('matching passwords post to /api/users/reset-password', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/reset-password?token=demo-token-xyz')
      await page.locator('input#password').fill('NewPass123!')
      await page.locator('input#confirm-password').fill('NewPass123!')
      await page
        .getByRole('button', { name: /reset password/i })
        .first()
        .click()
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    })
    const post = reqs.find(
      (r) => r.method === 'POST' && /\/api\/users\/reset-password$/.test(r.url),
    )
    expect(post, 'POST /api/users/reset-password fired').toBeTruthy()
    // Token is bogus so server returns 4xx — that's fine; the assertion is
    // that the request fires with the correct path and shape.
    expect(post!.postData ?? '').toContain('demo-token-xyz')
  })

  test('sign-in link returns to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=demo')
    await page
      .getByRole('link', { name: /^sign in$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('password fields are masked (type=password)', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=demo')
    await expect(page.locator('input#password')).toHaveAttribute('type', 'password')
    await expect(page.locator('input#confirm-password')).toHaveAttribute('type', 'password')
  })
})
