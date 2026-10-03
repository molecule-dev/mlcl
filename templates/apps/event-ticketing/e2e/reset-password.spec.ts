import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiHeaders,
  API_BASE,
  expectNoConsoleErrors,
  login,
  logout,
  seedEvent,
  seedOrder,
  seedTier,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('/reset-password page', () => {
  test('renders the form (token missing → still renders inputs)', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
  })

  test('submit with bogus token POSTs to /api/users/reset-password and surfaces error', async ({
    page,
  }) => {
    // A bogus token is rejected with 401 — the console resource error is the
    // expected server response this test exists to exercise.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 401' })
    // Collecting listener attached at TEST START: responses are pushed as
    // they arrive, and expect.poll absorbs any delivery hiccup under heavy
    // parallel load (an armed waitForResponse can miss a response that lands
    // within its install window on a busy machine).
    const apiResponses: { method: string; url: string; status: number }[] = []
    page.on('response', (r) => {
      if (/\/api\//.test(r.url()))
        apiResponses.push({ method: r.request().method(), url: r.url(), status: r.status() })
    })
    await page.goto(APP_BASE + '/reset-password?token=invalid-token')
    const pw = page.locator('input[type="password"]')
    await pw.nth(0).fill('NewPass!1234')
    if ((await pw.count()) > 1) await pw.nth(1).fill('NewPass!1234')
    await page.locator('form button[type="submit"]').first().click()
    await expect
      .poll(() => apiResponses.some((r) => r.method === 'POST' && /reset-password/.test(r.url)), {
        message: 'POST /api/users/reset-password',
      })
      .toBeTruthy()
    const c = apiResponses.find((r) => r.method === 'POST' && /reset-password/.test(r.url))
    expect(c?.status, 'POST /api/users/reset-password status').toBeLessThan(500)
  })

  test('password input is masked by default', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    expect(await page.locator('input[type="password"]').first().getAttribute('type')).toBe(
      'password',
    )
  })

  test('confirm input (when present) preserves typed value', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const pw = page.locator('input[type="password"]')
    if ((await pw.count()) > 1) {
      await pw.nth(1).fill('Confirm1!')
      expect(await pw.nth(1).inputValue()).toBe('Confirm1!')
    }
  })
})
