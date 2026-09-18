import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, expectNoConsoleErrors, signup } from './_helpers.js'

const AUTHED_ROUTES = [
  '/dashboard',
  '/shipments',
  '/carriers',
  '/alerts',
  '/analytics',
  '/webhooks',
  '/team',
  '/profile',
  '/notifications',
  '/settings',
] as const

test.describe('navigation + auth guard', () => {
  test('every authed route renders without console errors and without 5xx responses', async ({
    page,
  }) => {
    await signup(page)
    for (const route of AUTHED_ROUTES) {
      const errors = expectNoConsoleErrors(page)
      const reqs = await captureNetwork(page, async () => {
        await page.goto(APP_BASE + route, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(1_000)
      })
      const fiveXX = reqs.filter((r) => r.status >= 500)
      expect(
        fiveXX,
        `route ${route} produced 5xx responses: ${fiveXX.map((r) => `${r.status} ${r.url}`).join(', ')}`,
      ).toHaveLength(0)
      expect(errors, `route ${route} produced console errors: ${errors.join(' | ')}`).toEqual([])
    }
  })

  test('authed routes redirect anonymous visitors to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })
  })

  test('the sidebar nav links can navigate between authed pages', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page
      .getByRole('link', { name: /^Shipments$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/shipments$/)
    await page
      .getByRole('link', { name: /^Carriers$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/carriers$/)
    await page
      .getByRole('link', { name: /^Analytics$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/analytics$/)
    await page
      .getByRole('link', { name: /^Settings$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/settings$/)
  })
})
