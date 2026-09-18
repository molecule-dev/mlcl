import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/notifications', () => {
  test('notifications heading renders', async ({ page }) => {
    const { email } = await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('fetches /api/notifications', async ({ page }) => {
    const { email } = await signup(page)
    await page.goto(APP_BASE + '/notifications')
    const reqs = await captureNetwork(page, async () => {
      await page.reload()
      await page.waitForLoadState('networkidle')
    })
    expect(reqs.some((r) => /\/api\/notifications/.test(r.url))).toBeTruthy()
  })

  test('main region present', async ({ page }) => {
    const { email } = await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.locator('main').first()).toBeVisible()
  })
})
