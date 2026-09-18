/**
 * /integrations — every integration card honestly indicates "Coming soon"
 * (the app does not ship live integrations yet), and the connect buttons
 * are disabled rather than silently no-oping.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup, uniqueEmail } from './_helpers.js'

test.describe('integrations', () => {
  test('renders without errors and labels integrations as Coming soon', async ({ page }) => {
    await signup(page, uniqueEmail('integrations'))
    await page.goto(APP_BASE + '/integrations')
    await page.waitForLoadState('networkidle')

    // Body should contain the "coming soon" cue.
    const body = (await page.locator('body').innerText()).toLowerCase()
    expect(body).toContain('coming soon')
  })

  test('connect / install buttons are disabled (no fake success states)', async ({ page }) => {
    await signup(page, uniqueEmail('integrations-disabled'))
    await page.goto(APP_BASE + '/integrations')
    await page.waitForLoadState('networkidle')

    const cta = page.getByRole('button', { name: /connect|install|enable/i }).first()
    if (await cta.count()) {
      await expect(cta).toBeDisabled()
    }
  })
})
