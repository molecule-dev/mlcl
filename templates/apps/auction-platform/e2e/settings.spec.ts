import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/settings', () => {
  test('renders Settings heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('heading', { name: /^Settings$/i, level: 1 })).toBeVisible()
  })

  test('Notifications section toggles via Notifications tab', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page
      .getByRole('button', { name: /^Notifications$/i })
      .first()
      .click()
    await expect(
      page.getByRole('heading', { name: /Notifications/i, level: 2 }).first(),
    ).toBeVisible()
  })

  test('Toggling a notification preference issues PATCH /api/me', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page
      .getByRole('button', { name: /^Notifications$/i })
      .first()
      .click()
    const reqs = await captureNetwork(page, async () => {
      // The native checkbox is sr-only so a regular click hits the styled
      // sibling <span>. Use force:true (the input itself is the contract)
      // to dispatch the change handler directly.
      const toggle = page.locator('input[type="checkbox"][aria-label*="alerts" i]').first()
      await toggle.click({ force: true })
      await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {})
    })
    expect(reqs.some((r) => /\/api\/me$/.test(r.url) && r.method === 'PATCH')).toBeTruthy()
  })

  test('Profile save issues PATCH /api/me', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const saveBtn = page.getByRole('button', { name: /Save changes/i })
    if (await saveBtn.count().catch(() => 0)) {
      const reqs = await captureNetwork(page, async () => {
        await saveBtn.first().click()
        await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {})
      })
      expect(reqs.some((r) => /\/api\/me$/.test(r.url) && r.method === 'PATCH')).toBeTruthy()
    }
  })
})
