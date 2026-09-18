/**
 * /people — team directory pulled from /api/team.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('people page', () => {
  test('renders team grid with the freshly signed-up user', async ({ page }) => {
    const out = await signup(page, uniqueEmail('people-render'))
    await page.goto(APP_BASE + '/people')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('people-grid')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(out.email).first()).toBeVisible({ timeout: 10000 })
  })

  test('search filter narrows to matching teammates', async ({ page }) => {
    const out = await signup(page, uniqueEmail('people-search'))
    await page.goto(APP_BASE + '/people')
    await page.waitForLoadState('networkidle')
    await page.getByTestId('people-search').fill(out.email)
    // Should still find me
    await expect(page.getByText(out.email).first()).toBeVisible()
    await page.getByTestId('people-search').fill('zzzzz_no_such_user')
    await expect(page.getByTestId('people-empty')).toBeVisible()
  })

  test('team data comes from /api/team', async ({ page }) => {
    await signup(page, uniqueEmail('people-network'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/people')
      await page.waitForLoadState('networkidle')
    })
    const t = reqs.find((r) => /\/api\/team(\?|$)/.test(r.url))
    expect(t, 'people page should call /api/team').toBeTruthy()
    expect(t!.status).toBeLessThan(400)
  })

  test('Sign out from /people works AND Theme toggle flips on /people', async ({ page }) => {
    await signup(page, uniqueEmail('people-signout-theme'))
    await page.goto(APP_BASE + '/people')
    const before = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    await page
      .getByRole('button', { name: /Toggle theme/i })
      .first()
      .click()
    await page.waitForTimeout(200)
    const after = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    expect(after).not.toBe(before)
    await page
      .getByRole('button', { name: /SIGN OUT|Sign out/i })
      .first()
      .click()
    await page.waitForURL(/\/login/, { timeout: 5000 })
  })
})
