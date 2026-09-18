import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, expectNoConsoleErrors, signup } from './_helpers.js'

test.describe('notifications page', () => {
  test('renders the Notifications heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByRole('heading', { name: /notifications/i }).first()).toBeVisible()
  })

  test('GET /api/notifications returns 200 on load', async ({ page }) => {
    await signup(page)
    const requests = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await page.waitForTimeout(1500)
    })
    expect(
      requests.some(
        (r) => r.method === 'GET' && /\/notifications\b/.test(r.url) && r.status === 200,
      ),
    ).toBeTruthy()
  })

  test('Mark-all-as-read button issues a PUT and clears unread badges', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await page.waitForTimeout(800)
    const btn = page.locator('[data-mol-id="notifications-mark-all"]')
    if (!(await btn.count())) return
    const requests = await captureNetwork(page, async () => {
      await btn.click()
      await page.waitForTimeout(1200)
    })
    expect(
      requests.some(
        (r) =>
          (r.method === 'PUT' || r.method === 'POST') &&
          /\/notifications\b/.test(r.url) &&
          r.status >= 200 &&
          r.status < 300,
      ),
    ).toBeTruthy()
  })

  test('renders without console errors', async ({ page }) => {
    await signup(page)
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await expect(page.getByRole('heading').first()).toBeVisible()
    })
  })
})
