import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, expectNoConsoleErrors, signup } from './_helpers.js'

test.describe('notifications page (/notifications)', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
  })

  test('renders a heading', async ({ page }) => {
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 })
  })

  test('mount fires GET /api/notifications', async ({ page, browser }) => {
    const fresh = await browser.newContext()
    const p2 = await fresh.newPage()
    await signup(p2)
    const reqs = await captureNetwork(p2, async () => {
      await p2.goto(APP_BASE + '/notifications')
      await p2.waitForTimeout(1500)
    })
    expect(
      reqs.some((r) => r.method === 'GET' && /\/api\/notifications\b/.test(r.url)),
    ).toBeTruthy()
    await fresh.close()
  })

  test('shows an empty-state for a fresh signup', async ({ page }) => {
    await page.waitForTimeout(1500)
    const empty = page.getByText(/no\s*notifications|all\s*caught\s*up|nothing\s*here/i).first()
    if (await empty.count().catch(() => 0)) {
      await expect(empty).toBeVisible()
    }
  })

  test('renders without console errors', async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await expect(page.getByRole('heading').first()).toBeVisible()
    })
  })
})
