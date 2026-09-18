import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, expectNoConsoleErrors, signup } from './_helpers.js'

test.describe('pricing page (/pricing)', () => {
  test('renders a heading and at least one tier', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/free|pro|team/i).first()).toBeVisible()
  })

  test('mount fires GET /api/billing/tiers', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await page.waitForTimeout(1500)
    })
    expect(
      reqs.some((r) => r.method === 'GET' && /\/api\/billing\/tiers\b/.test(r.url)),
    ).toBeTruthy()
  })

  test('clicking an upgrade CTA while authenticated POSTs /api/billing/checkout', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/pricing')
    await page.waitForTimeout(800)
    const cta = page
      .getByRole('button', { name: /upgrade.*pro|choose\s*pro|subscribe.*pro|select\s*pro/i })
      .first()
    if (await cta.count().catch(() => 0)) {
      const reqs = await captureNetwork(page, async () => {
        await cta.click()
        await page.waitForTimeout(2500)
      })
      const call = reqs.find((r) => r.method === 'POST' && /\/api\/billing\/checkout\b/.test(r.url))
      expect(call, 'POST /api/billing/checkout not observed').toBeTruthy()
      expect([200, 201, 202, 303, 400, 402]).toContain(call!.status)
    }
  })

  test('renders without console errors', async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await expect(page.getByRole('heading').first()).toBeVisible()
    })
  })
})
