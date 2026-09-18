import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/settings', () => {
  test('profile tab is initially active', async ({ page }) => {
    const { email } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByTestId('settings-tab-profile')).toBeVisible()
  })

  test('shipping tab switches view', async ({ page }) => {
    const { email } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByTestId('settings-tab-shipping').click()
    await expect(page.getByText(/shipping address/i).first()).toBeVisible()
  })

  test('save button PATCHes /api/profile/me', async ({ page }) => {
    const { email } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('input[name="name"]').fill('Walker Tester')
    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('settings-save').click()
      await page.waitForTimeout(1200)
    })
    expect(reqs.some((r) => /\/api\/profile\/me/.test(r.url) && r.method === 'PATCH')).toBeTruthy()
  })
})
