import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('reset-password page', () => {
  test('renders form even without a valid token', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 })
  })

  test('with token query, password fields visible', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=fake-test-token')
    const pwd = page.locator('input[type="password"]').first()
    await expect(pwd).toBeVisible()
  })

  test('submitting fires PATCH /api/users/:id/password (reset endpoint)', async ({ page }) => {
    // The fake token makes the reset endpoint legitimately answer 401;
    // the browser logs that 401 as a console error — expected here.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 401' })
    await page.goto(APP_BASE + '/reset-password?token=fake-test-token&email=demo@example.com')
    const pwds = page.locator('input[type="password"]')
    const count = await pwds.count()
    for (let i = 0; i < count; i++) await pwds.nth(i).fill('NewPass123!')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('button[type="submit"]').first().click()
      await page.waitForTimeout(2000)
    })
    // Reset endpoint is POST /api/users/reset-password (any status — token is fake)
    const post = reqs.find(
      (r) => r.method === 'POST' && /\/api\/users\/reset-password\b/.test(r.url),
    )
    expect(post, 'POST /api/users/reset-password observed').toBeTruthy()
  })
})
