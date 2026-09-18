import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers'

// /settings/team — list members + invite form. Inviting fires
// POST /api/team_members and the invitee appears in the pending list.

test.describe('/settings/team', () => {
  test('GET /api/team_members fires + heading visible', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings/team')
      await page.getByRole('heading', { name: /Workspace members/i }).waitFor({ timeout: 15_000 })
    })
    const call = reqs.find((r) => /\/api\/team_members(\?|$)/.test(r.url) && r.method === 'GET')
    expect(call, 'GET /api/team_members should fire').toBeTruthy()
    expect(call!.status).toBe(200)
  })

  test('Invite email field is editable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings/team')
    await page.locator('input[name="email"]').fill('mate@example.com')
    await expect(page.locator('input[name="email"]')).toHaveValue('mate@example.com')
  })

  test('Invite submit fires POST /api/team_members and pending list reflects invitee', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings/team')
    await page.getByRole('heading', { name: /Workspace members/i }).waitFor({ timeout: 15_000 })
    const invite = uniqueEmail('invitee')
    await page.locator('input[name="email"]').fill(invite)
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /send invite/i }).click()
      await page.waitForTimeout(2000)
    })
    const post = reqs.find((r) => /\/api\/team_members(\?|$)/.test(r.url) && r.method === 'POST')
    expect(post, 'POST /api/team_members should fire').toBeTruthy()
    // The status may be 200 or 201; reject only if 4xx/5xx.
    expect(post!.status).toBeLessThan(400)
    // Invitee appears in pending list (rendered when at least one pending row exists).
    await expect(page.getByText(invite, { exact: false })).toBeVisible({ timeout: 10_000 })
  })
})
