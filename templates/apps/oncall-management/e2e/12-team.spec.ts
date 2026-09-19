import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, inviteTeamMember, listTeam, signup, uniqueEmail } from './_helpers.js'

test.describe('/team', () => {
  test('anonymous redirected off /team', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/team')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/login|\/signup|\/$/, { timeout: 15_000 })
  })

  test('renders seeded responders with on-call flags', async ({ page }) => {
    await signup(page, uniqueEmail('team-list'))
    const team = await listTeam(page)
    expect(team.members.length).toBeGreaterThan(0)
    await page.goto(APP_BASE + '/team')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h1').first()).toBeVisible()
    expect(await page.locator('[data-testid="team-toggle-oncall"]').count()).toBeGreaterThan(0)
  })

  test('invite form posts a new pending invite', async ({ page }) => {
    await signup(page, uniqueEmail('team-invite'))
    const inviteEmail = uniqueEmail('invitee')
    const invite = await inviteTeamMember(page, { email: inviteEmail, role: 'responder' })
    expect(invite.email).toBe(inviteEmail)
    await page.goto(APP_BASE + '/team')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toContainText(inviteEmail)
  })
})
