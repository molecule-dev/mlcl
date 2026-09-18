import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, getOrder, listOrders, seedSampleData, signup } from './_helpers.js'

test.describe('/pick/:id picks every line and advances order', () => {
  test('toggling all line items enables Complete and advances the order to packed', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await seedSampleData(page, accessToken)

    const orders = await listOrders(page, accessToken)
    const candidate = orders.find((o) => o.status === 'pending' || o.status === 'picking')
    test.skip(!candidate, 'no order to pick')
    if (!candidate) return

    await page.goto(`${APP_BASE}/pick/${candidate.id}`)
    await expect(page.getByTestId('picklist-page')).toBeVisible()

    // Click each pick line item to mark it fully picked.
    const itemButtons = page.locator('[data-testid="picklist-items"] button')
    const count = await itemButtons.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < count; i++) {
      await itemButtons.nth(i).click()
      await page.waitForTimeout(80)
    }

    // Complete should now be enabled.
    const complete = page.getByTestId('picklist-complete')
    await expect(complete).toBeEnabled()
    await complete.click()
    await page.waitForTimeout(1500)

    // Order should now be packed (or shipped if it was already packed).
    const after = await getOrder(page, accessToken, candidate.id)
    expect(['packed', 'shipped'], `order ${candidate.id} status after complete`).toContain(
      after.status,
    )
  })

  test('localStorage persists in-progress pick state across reload', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedSampleData(page, accessToken)
    const orders = await listOrders(page, accessToken)
    const candidate = orders.find((o) => o.status === 'pending' || o.status === 'picking')
    test.skip(!candidate, 'no order to pick')
    if (!candidate) return

    await page.goto(`${APP_BASE}/pick/${candidate.id}`)
    await expect(page.getByTestId('picklist-page')).toBeVisible()
    const items = page.locator('[data-testid="picklist-items"] button')
    const total = await items.count()
    test.skip(total < 2, 'need ≥2 lines for partial-progress test')
    if (total < 2) return

    await items.first().click()
    await page.waitForTimeout(200)
    const stored = await page.evaluate(() => window.localStorage.getItem('wf-pick-progress'))
    expect(stored, 'wf-pick-progress key persisted').toBeTruthy()

    await page.reload()
    await expect(page.getByTestId('picklist-page')).toBeVisible()
    const restored = await page.evaluate(() => window.localStorage.getItem('wf-pick-progress'))
    expect(restored).toBeTruthy()
  })
})
