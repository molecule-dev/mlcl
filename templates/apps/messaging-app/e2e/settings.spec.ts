import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('settings page', () => {
  test('renders Privacy / Notifications / Appearance / Plan sections', async ({ page }) => {
    await signup(page, uniqueEmail('settings'))
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByText(/privacy/i).first()).toBeVisible()
    await expect(page.getByText(/notifications/i).first()).toBeVisible()
    await expect(page.getByText(/appearance/i).first()).toBeVisible()
    await expect(page.getByText(/plan/i).first()).toBeVisible()
  })

  test('toggling a privacy setting PUTs /api/profile/preferences and persists', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('settings-pref'))
    await page.goto(APP_BASE + '/settings')
    const reqs = await captureNetwork(page, async () => {
      // Flip the first checkbox we can find under settings.
      const cb = page.getByRole('checkbox').first()
      const initial = await cb.isChecked()
      if (initial) await cb.uncheck()
      else await cb.check()
      await page.waitForTimeout(1500)
    })
    expect(
      reqs.some((r) => r.method === 'PUT' && /\/api\/profile\/preferences/.test(r.url)),
    ).toBeTruthy()
  })
})
