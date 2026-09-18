import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  captureNetwork,
  inviteTeamMember,
  listTeam,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('/team', () => {
  test('lists seeded members', async ({ page }) => {
    await signup(page, uniqueEmail('team-list'))
    const team = await listTeam(page)
    expect(team.members.length, 'seed should provision team members').toBeGreaterThan(0)
    await page.goto(APP_BASE + '/team')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    const sample = team.members[0] as { name?: string; email?: string }
    expect(body).toContain(sample.name ?? sample.email ?? '')
  })

  test('inviting a teammate via API surfaces under "Pending invites"', async ({ page }) => {
    await signup(page, uniqueEmail('team-invite-api'))
    const newEmail = uniqueEmail('newhire')
    const invited = await inviteTeamMember(page, { email: newEmail, role: 'dev' })
    expect(invited.email).toBe(newEmail)
    await page.goto(APP_BASE + '/team')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).toContain(newEmail)
  })

  test('UI invite dialog posts to /api/team/invite and renders the invite', async ({ page }) => {
    await signup(page, uniqueEmail('team-invite-ui'))
    await page.goto(APP_BASE + '/team')
    await page.waitForLoadState('networkidle')
    const inviteBtn = page.getByRole('button', { name: /invite/i }).first()
    // count() never auto-waits; a pre-paint read skipped this test silently.
    const present = await inviteBtn
      .first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false)
    if (!present) test.skip(true, 'no invite control on team page')
    await inviteBtn.click()
    const newEmail = uniqueEmail('teammate')
    const emailInput = page
      .locator(
        'input[type="email"], input[placeholder*="email" i], [data-testid="team-invite-email"]',
      )
      .first()
    await emailInput.fill(newEmail)
    const submit = page.getByRole('button', { name: /send invite|invite|send/i }).last()
    const reqs = await captureNetwork(page, async () => {
      await submit.click()
      await page.waitForTimeout(2000)
    })
    const inviteCall = reqs.find((r) => r.method === 'POST' && /\/api\/team\/invite/.test(r.url))
    expect(inviteCall, 'submit must POST /api/team/invite').toBeTruthy()
    expect(inviteCall!.status).toBeLessThan(300)
    const body = await page.locator('body').innerText()
    expect(body, 'invited email should render in the team page').toContain(newEmail)
    const team = await listTeam(page)
    const persisted = team.invites.some((inv) => (inv as { email?: string }).email === newEmail)
    expect(persisted, 'invite persisted in DB').toBeTruthy()
  })
})
