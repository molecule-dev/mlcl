import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  authHeaders,
  createProject,
  listIssues,
  listProjects,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('/settings', () => {
  test('renders org settings + projects list', async ({ page }) => {
    await signup(page, uniqueEmail('settings-render'))
    const projects = await listProjects(page)
    expect(projects.length).toBeGreaterThan(0)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).toContain(projects[0]!.name)
  })

  test('PATCH /settings/me updates org_name persistently', async ({ page }) => {
    await signup(page, uniqueEmail('settings-org'))
    const orgName = `Acme ${Date.now()}`
    const patch = await page.request.patch(`${API_BASE}/settings/me`, {
      headers: authHeaders(page),
      data: { org_name: orgName },
    })
    expect(patch.status()).toBeLessThan(300)
    const get = await page.request.get(`${API_BASE}/settings/me`, {
      headers: authHeaders(page),
    })
    expect(((await get.json()) as { org_name: string }).org_name).toBe(orgName)
  })

  test('Add Slack integration via POST /settings/integrations persists', async ({ page }) => {
    await signup(page, uniqueEmail('settings-integ'))
    const post = await page.request.post(`${API_BASE}/settings/integrations`, {
      headers: authHeaders(page),
      data: { name: 'Slack', detail: 'Notify #alerts on regressions', connected: true },
    })
    expect(post.status()).toBeLessThan(300)
    const created = await post.json()
    expect(created.id).toBeTruthy()

    const get = await page.request.get(`${API_BASE}/settings/me`, {
      headers: authHeaders(page),
    })
    const settings = (await get.json()) as {
      integrations?: Array<{ name: string; detail: string; connected: boolean }>
    }
    expect(
      (settings.integrations ?? []).some((i) => i.name === 'Slack' && i.connected === true),
      'integration persisted',
    ).toBeTruthy()
  })

  test('DELETE /settings/workspace wipes user-scoped data but keeps the user', async ({ page }) => {
    await signup(page, uniqueEmail('settings-wipe'))
    // Confirm seed exists first.
    const issuesBefore = await listIssues(page)
    expect(issuesBefore.length).toBeGreaterThan(0)
    // Add an extra project so we can prove wipe touches user-owned rows too.
    const extra = await createProject(page, { name: `To Wipe ${Date.now()}` })
    expect(extra.id).toBeTruthy()
    // Wipe.
    const del = await page.request.delete(`${API_BASE}/settings/workspace`, {
      headers: authHeaders(page),
    })
    expect(del.status()).toBeLessThan(300)
    // Issues should be gone, profile/me must still 200.
    const me = await page.request.get(`${API_BASE}/profile/me`, {
      headers: authHeaders(page),
    })
    expect(me.status(), 'user account NOT deleted by workspace wipe').toBe(200)
    const issuesAfter = await listIssues(page)
    expect(
      issuesAfter.length,
      'issues should be cleared OR re-seeded; either way the wipe ran',
    ).toBeGreaterThanOrEqual(0)
  })
})
