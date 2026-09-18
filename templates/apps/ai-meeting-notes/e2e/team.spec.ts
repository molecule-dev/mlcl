import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

/**
 * Per-page spec for /team. Active members + Pending invitations
 * sections, with an Invite teammate button that opens a dialog
 * posting to /api/team.
 */

test.describe('team page', () => {
  test('team heading is visible', async ({ page }) => {
    await signup(page, uniqueEmail('team-h'), 'TestPass123!')
    await page.goto(APP_BASE + '/team')
    await expect(page.getByRole('heading', { name: /^team$/i }).first()).toBeVisible()
  })

  test('Invite teammate button is rendered', async ({ page }) => {
    await signup(page, uniqueEmail('team-inv'), 'TestPass123!')
    await page.goto(APP_BASE + '/team')
    await expect(page.getByRole('button', { name: /invite teammate/i }).first()).toBeVisible()
  })

  test('Active members section header is rendered', async ({ page }) => {
    await signup(page, uniqueEmail('team-act'), 'TestPass123!')
    await page.goto(APP_BASE + '/team')
    await expect(page.getByText(/active members/i).first()).toBeVisible()
  })

  test('signed-in user appears as the synthesized Owner row', async ({ page }) => {
    await signup(page, uniqueEmail('team-self'), 'TestPass123!')
    await page.goto(APP_BASE + '/team')
    const row = page.locator('[data-mol-id^="team-member-self:"]').first()
    await expect(row).toBeVisible()
  })

  test('GET /api/team fires on page load', async ({ page }) => {
    await signup(page, uniqueEmail('team-net'), 'TestPass123!')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/team')
      await page.waitForLoadState('networkidle')
    })
    const getCall = reqs.find((r) => /\/api\/team(\?|$)/.test(r.url) && r.method === 'GET')
    expect(getCall, 'GET /api/team must fire').toBeTruthy()
    expect([200, 201]).toContain(getCall!.status)
  })

  test('sidebar nav-team chrome is rendered', async ({ page }) => {
    await signup(page, uniqueEmail('team-nav'), 'TestPass123!')
    await page.goto(APP_BASE + '/team')
    await expect(page.locator('[data-mol-id="nav-team"]').first()).toBeVisible()
  })
})
