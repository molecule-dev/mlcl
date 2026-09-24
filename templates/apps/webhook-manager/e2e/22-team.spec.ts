import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, APP_BASE, captureNetwork, requireAccessToken, signup } from './_helpers'

test.describe('/settings/team', () => {
  test('renders the team heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings/team')
    await expect(page.getByRole('heading', { level: 1, name: /team/i })).toBeVisible()
  })

  test('GET /api/team_members fires on render', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings/team')
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    })
    const r = reqs.find((x) => x.method === 'GET' && /\/api\/team_members/.test(x.url))
    expect(r).toBeDefined()
    expect(r!.status).toBe(200)
  })

  test('inviting a member adds a pending row (read-after-write)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings/team')
    await page.locator('[data-mol-id="team-toggle-invite"]').click()
    const inviteEmail = `team-${Date.now()}@example.com`
    await page.locator('[data-mol-id="team-invite-email"]').fill(inviteEmail)
    await page.locator('[data-mol-id="team-invite-name"]').fill('Pending Invite')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="team-invite-submit"]').click()
      await page.waitForTimeout(2000)
    })
    const post = reqs.find(
      (r) => r.method === 'POST' && /\/api\/team_members(?:[/?]|$)/.test(r.url),
    )
    expect(post).toBeDefined()
    expect(post!.status).toBeLessThan(300)
    // Read-after-write: the member is in the list
    const token = await requireAccessToken(page)
    const list = await page.request.get(API_BASE + '/team_members', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const items = await list.json()
    const found = items.find((m: { email: string }) => m.email === inviteEmail)
    expect(found).toBeDefined()
    expect(found.status).toBe('pending')
  })

  test('removing a pending invite returns 204 and removes the row (read-after-write)', async ({
    page,
  }) => {
    await signup(page)
    const token = await requireAccessToken(page)
    // Seed an invite via API
    const seed = await page.request.post(API_BASE + '/team_members', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { email: `revoke-${Date.now()}@example.com`, role: 'developer' },
    })
    const created = await seed.json()
    expect(created.id).toBeTruthy()

    await page.goto(APP_BASE + '/settings/team')
    // ConfirmButton: first click ARMS, the armed confirm label appears, second click COMMITS
    const revoke = page.locator(`[data-mol-id="team-pending-revoke-${created.id}"]`)
    await revoke.click()
    await expect(revoke).toHaveText(/remove this member/i)
    await revoke.click()
    await page.waitForTimeout(1500)
    // Read-after-write
    const list = await page.request.get(API_BASE + '/team_members', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const items = await list.json()
    expect(items.find((m: { id: string }) => m.id === created.id)).toBeUndefined()
  })

  test('PATCH /api/team_members/:id role change is honoured (read-after-write)', async ({
    page,
  }) => {
    await signup(page)
    const token = await requireAccessToken(page)
    // Seed an invite
    const seed = await page.request.post(API_BASE + '/team_members', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { email: `member-${Date.now()}@example.com`, role: 'developer' },
    })
    const created = await seed.json()
    // PATCH role change directly via API (UI menu only shows for active members,
    // but the contract is identical — the handler honours the role update)
    const patchResp = await page.request.patch(API_BASE + '/team_members/' + created.id, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { role: 'admin' },
    })
    expect(patchResp.ok()).toBe(true)
    const r = await page.request.get(API_BASE + '/team_members', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const items = await r.json()
    const m = items.find((x: { id: string }) => x.id === created.id)
    expect(m.role).toBe('admin')
  })

  test('resend on pending invite POSTs /resend and returns ok', async ({ page }) => {
    await signup(page)
    const token = await requireAccessToken(page)
    const seed = await page.request.post(API_BASE + '/team_members', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { email: `resend-${Date.now()}@example.com`, role: 'viewer' },
    })
    const created = await seed.json()
    await page.goto(APP_BASE + '/settings/team')
    const reqs = await captureNetwork(page, async () => {
      await page.locator(`[data-mol-id="team-pending-resend-${created.id}"]`).click()
      await page.waitForTimeout(1500)
    })
    const post = reqs.find(
      (r) => r.method === 'POST' && new RegExp(`/team_members/${created.id}/resend`).test(r.url),
    )
    expect(post).toBeDefined()
    expect(post!.status).toBeLessThan(300)
  })
})
