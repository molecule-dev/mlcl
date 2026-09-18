import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  authHeaders,
  captureNetwork,
  inviteMember,
  primaryWorkspace,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('team /team', () => {
  test('page loads and the workspace bootstrap call succeeds', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/team')
      await page.waitForLoadState('networkidle')
    })
    const wsCall = reqs.find(
      (r) => /\/api\/workspaces\/me\/primary/.test(r.url) && r.method === 'GET',
    )
    expect(wsCall?.status).toBe(200)
  })

  test('owner appears as a workspace member after signup', async ({ page }) => {
    const { accessToken, userId } = await signup(page)
    const ws = await primaryWorkspace(page, accessToken)
    const res = await page.request.get(`${API_BASE}/workspace-members/${ws.id}`, {
      headers: authHeaders(accessToken),
    })
    const members = (await res.json()) as Array<{ user_id: string; role: string }>
    expect(members.some((m) => m.user_id === userId && m.role === 'owner')).toBe(true)
  })

  test('invite endpoint adds a known user to the workspace', async ({ page }) => {
    const owner = await signup(page, uniqueEmail('team-owner'))
    const invitee = await signup(page, uniqueEmail('team-invitee'))
    const ws = await primaryWorkspace(page, owner.accessToken)
    const result = await inviteMember(page, owner.accessToken, ws.id, invitee.email)
    expect(result.invited).toBe(true)
    const after = await page.request.get(`${API_BASE}/workspace-members/${ws.id}`, {
      headers: authHeaders(owner.accessToken),
    })
    const list = (await after.json()) as Array<{ user_id: string }>
    expect(list.some((m) => m.user_id === invitee.userId)).toBe(true)
  })

  test('invite form fields render on the page', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/team')
    await page.waitForLoadState('networkidle')
    const emailInput = page.locator('input[type="email"]').first()
    await expect(emailInput.first()).toBeAttached()
  })

  test('captureNetwork sees GET /api/workspace-members/:wsId', async ({ page }) => {
    const { accessToken } = await signup(page)
    await primaryWorkspace(page, accessToken)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/team')
      await page.waitForLoadState('networkidle')
    })
    const call = reqs.find(
      (r) => /\/api\/workspace-members\/[0-9a-f-]{36}$/.test(r.url) && r.method === 'GET',
    )
    expect(call?.status).toBe(200)
  })
})
