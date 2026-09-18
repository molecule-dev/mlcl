import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, apiRaw, captureNetwork, signup } from './_helpers.js'

test('/team page renders the workspace shell heading', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/team')
  await expect(page.getByRole('heading', { name: /team/i }).first()).toBeVisible()
})

test('/team workspace is provisioned implicitly on first GET (read-after-write)', async ({
  page,
}) => {
  await signup(page)
  const team = await api<{ workspace_id: string; members: Array<unknown> }>(page, 'GET', '/team')
  expect(team.workspace_id, 'workspace was provisioned for the user').toBeTruthy()
})

test('/team invite endpoint accepts a documented role and rejects an unknown role', async ({
  page,
}) => {
  await signup(page)
  // Invalid role: 4xx
  const bad = await apiRaw(page, 'POST', '/team/invite', {
    email: 'someone@example.com',
    role: 'master-of-the-universe',
  })
  expect(bad.status()).toBeGreaterThanOrEqual(400)
  // Valid role: 2xx (or a soft-warning 4xx if email delivery is sandboxed,
  // but the route should not be 5xx).
  const good = await apiRaw(page, 'POST', '/team/invite', {
    email: `invitee-${Date.now()}@example.com`,
    role: 'editor',
  })
  expect(good.status()).toBeLessThan(500)
})

test('/team renders the member list including the signed-in user', async ({ page }) => {
  const { email } = await signup(page)
  const team = await api<{
    members: Array<{ email?: string; role?: string }>
  }>(page, 'GET', '/team')
  expect(Array.isArray(team.members)).toBe(true)
  // The signed-in user IS the workspace owner and must therefore appear
  // as a workspace_member row (with role admin/owner) on the very first
  // GET. Without this row, the /team page reads "No teammates yet" and
  // the user can't manage their own admin permissions.
  const me = team.members.find((m) => m.email === email)
  expect(me, `signed-in user ${email} should appear as a member`).toBeTruthy()
  expect(me!.role).toMatch(/admin|owner/i)
})

test('observation invariant: /team fires GET /api/team on page load', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/team')
    await page.waitForLoadState('networkidle').catch(() => {})
  })
  expect(reqs.find((r) => /\/api\/team\b/.test(r.url) && r.method === 'GET')).toBeTruthy()
})
