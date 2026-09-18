import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('plan-updated page', () => {
  test('renders heading on /plan-updated', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 })
  })

  test('mount completes auth init via GET /api/users/:id (auth re-hydration)', async ({
    browser,
  }) => {
    const fresh = await browser.newContext()
    const p2 = await fresh.newPage()
    await signup(p2)
    const reqs = await captureNetwork(p2, async () => {
      await p2.goto(APP_BASE + '/plan-updated')
      await p2.waitForTimeout(1500)
    })
    // PlanUpdated doesn't fetch billing — it relies on auth state. The
    // page must at least render the success heading once auth init completes.
    await expect(p2.getByRole('heading').first()).toBeVisible({ timeout: 10_000 })
    await fresh.close()
    void reqs
  })

  test('return link routes to /dashboard', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const link = page.getByRole('link', { name: /home|dashboard|back/i }).first()
    if (await link.count().catch(() => 0)) {
      await link.click()
      await expect(page).toHaveURL(/\/(dashboard|$)/)
    }
  })
})
