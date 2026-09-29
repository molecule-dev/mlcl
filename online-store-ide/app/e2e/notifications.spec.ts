import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/notifications', () => {
  test('renders the notifications shell for a signed-in user', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {})
    })
    await expect(page.getByRole('heading', { name: /notifications/i }).first()).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText(/all caught up|no notifications/i).first()).toBeVisible()
    expect(reqs.length).toBeGreaterThan(0)
  })
})
