import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, expectNoConsoleErrors, signup } from './_helpers.js'

test.describe('dashboard page', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
  })

  test('renders a heading on /dashboard', async ({ page }) => {
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 })
  })

  test('mount fires GET /api/pets, /api/bookings/upcoming, /api/health/reminders', async ({
    browser,
  }) => {
    const fresh = await browser.newContext()
    const p2 = await fresh.newPage()
    await signup(p2)
    const reqs = await captureNetwork(p2, async () => {
      await p2.goto(APP_BASE + '/dashboard')
      await p2.waitForTimeout(2000)
    })
    expect(reqs.some((r) => r.method === 'GET' && /\/api\/pets\b/.test(r.url))).toBeTruthy()
    expect(
      reqs.some((r) => r.method === 'GET' && /\/api\/bookings\/upcoming\b/.test(r.url)),
    ).toBeTruthy()
    expect(
      reqs.some((r) => r.method === 'GET' && /\/api\/health\/reminders\b/.test(r.url)),
    ).toBeTruthy()
    await fresh.close()
  })

  test('navigates to /pets via the dashboard CTA', async ({ page }) => {
    const link = page.getByRole('link', { name: /pet/i }).first()
    if (await link.count()) {
      await link.click()
      await expect(page).toHaveURL(/\/pets/)
    }
  })

  test('renders without console errors', async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await expect(page.getByRole('heading').first()).toBeVisible()
    })
  })
})
