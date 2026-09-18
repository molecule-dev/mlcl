import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, seedMap, signup, uniqueEmail } from './_helpers.js'

test.describe('Profile', () => {
  test('displays user email + map stats reflect real data', async ({ page }) => {
    const email = uniqueEmail('profile')
    const { accessToken } = await signup(page, email)
    await seedMap(page, accessToken, 'Profile map A')
    await seedMap(page, accessToken, 'Profile map B')

    await page.goto(APP_BASE + '/profile')
    await expect(page.locator('[data-mol-id="profile-email"]')).toHaveText(email)
    await expect(page.locator('[data-mol-id="profile-stats"]')).toBeVisible()
    // The "Maps created" stat should be at least 2
    const mapsCard = page
      .locator('[data-mol-id="profile-stats"]')
      .locator('text=Maps created')
      .locator('..')
    await expect(mapsCard).toContainText(/[2-9]\d*|\d{2,}/)
  })
})
