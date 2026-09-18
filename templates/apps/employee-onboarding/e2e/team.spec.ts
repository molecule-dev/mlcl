/**
 * Team directory + profile — the directory lists seeded teammates; each
 * card links to a profile page that shows that teammate's bio. Sidebar
 * nav links round-trip the user through dashboard / checklist / timeline.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('team', () => {
  test('team directory renders cards from /api/team-members', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('team-dir'))
    const r = await page.request.get(`${API_BASE}/team-members`, {
      headers: authHeaders(accessToken),
    })
    const team = (await r.json()) as Array<{ id: string; name: string }>
    expect(team.length).toBeGreaterThan(0)
    const sample = team[0]

    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/team')
      await page.waitForLoadState('networkidle')
    })
    await expect(page.locator('[data-mol-id="page-team-directory"]').first()).toBeVisible()
    await expect(page.getByText(sample.name).first()).toBeVisible()
    expect(reqs.some((r) => /\/api\/team-members(\b|\?)/.test(r.url) && r.method === 'GET')).toBe(
      true,
    )
  })

  test('team profile page loads a teammate by id', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('team-profile'))
    const r = await page.request.get(`${API_BASE}/team-members`, {
      headers: authHeaders(accessToken),
    })
    const team = (await r.json()) as Array<{ id: string; name: string }>
    const sample = team[0]

    await page.goto(APP_BASE + `/team/${sample.id}`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-mol-id="page-team-profile"]').first()).toBeVisible()
    await expect(page.getByRole('heading', { name: sample.name }).first()).toBeVisible()
  })

  test('team sidebar nav links route to dashboard/checklist/timeline', async ({ page }) => {
    await signup(page, uniqueEmail('team-nav'))
    await page.goto(APP_BASE + '/team')
    await page.waitForLoadState('networkidle')
    for (const path of ['/dashboard', '/checklist', '/timeline']) {
      const link = page.locator(`a[href="${path}"]`).first()
      await expect(link, `expected sidebar nav link to ${path}`).toBeVisible()
    }
  })
})
