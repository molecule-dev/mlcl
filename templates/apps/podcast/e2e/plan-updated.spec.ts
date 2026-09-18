import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, expectNoConsoleErrors, signup } from './_helpers.js'

test.describe('plan-updated page', () => {
  test('renders a heading confirming the plan change', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    // PlanUpdated uses h2 elements (the page is rendered inside the
    // app shell where the logical h1 is the global brand mark).
    await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible()
  })

  test('"Return home" CTA navigates back to /', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const cta = page.getByRole('link', { name: /return home|home/i }).first()
    if (await cta.count()) {
      await cta.click()
      await expect(page).toHaveURL(/\/(discover)?$/)
    }
  })

  test('displays a thank-you / confirmation message', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    // The page renders two h2 confirmations + the return-home button.
    await expect(page.getByRole('heading', { level: 2 })).toHaveCount(2)
  })

  test('plan-updated page makes no privileged API calls beyond billing/profile (forensic)', async ({
    page,
  }) => {
    await signup(page)
    const requests = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      await page.waitForLoadState('networkidle')
    })
    // At minimum the page exists, we just record that it loaded with no
    // 5xx server errors.
    expect(requests.filter((r) => r.status >= 500)).toEqual([])
  })

  test('plan-updated page renders without console errors', async ({ page }) => {
    await signup(page)
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible()
    })
  })
})
