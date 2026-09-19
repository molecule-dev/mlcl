import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup, uniqueEmail } from './_helpers.js'

test.describe('/plan-updated', () => {
  test('renders the shared plan-updated page for an authed user', async ({ page }) => {
    await signup(page, uniqueEmail('plan'))
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main, [role="main"], body').first()).toBeVisible()
    const body = await page.locator('body').innerText()
    expect(body.length).toBeGreaterThan(0)
  })
})
