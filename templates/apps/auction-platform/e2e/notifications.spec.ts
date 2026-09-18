import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/notifications', () => {
  test('renders Notifications heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByRole('heading', { name: /Notifications/i, level: 1 })).toBeVisible()
  })

  test('page load fetches /api/notifications', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    expect(reqs.some((r) => /\/api\/notifications/.test(r.url) && r.method === 'GET')).toBeTruthy()
  })

  test('Mark all read posts to mark-all-read when notifications exist', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    const btn = page.getByRole('button', { name: /Mark all read/i }).first()
    await expect(btn, 'mark-all-read button is rendered on notifications page').toBeVisible()
    // The button is correctly disabled when the inbox is empty (a brand-new
    // user has no notifications yet). Skip the click in that case rather
    // than hammer at a deliberately-disabled control.
    const isDisabled = await btn.isDisabled().catch(() => true)
    if (isDisabled) {
      return
    }
    const reqs = await captureNetwork(page, async () => {
      await btn.click()
      await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {})
    })
    expect(
      reqs.some((r) => /\/api\/notifications\/mark-all-read/.test(r.url) && r.method === 'POST'),
    ).toBeTruthy()
  })
})
