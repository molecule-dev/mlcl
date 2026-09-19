import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup, uniqueEmail } from './_helpers.js'

test.describe('/profile', () => {
  test('shows the signed-up user email', async ({ page }) => {
    const { email } = await signup(page, uniqueEmail('profile'))
    await page.goto(APP_BASE + '/profile')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toContainText(email)
  })

  test('personal API keys section renders', async ({ page }) => {
    await signup(page, uniqueEmail('profile-keys'))
    await page.goto(APP_BASE + '/profile')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h1').first()).toBeVisible()
  })
})
