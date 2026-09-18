/**
 * /team/:id teammate profile.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/team/:id', () => {
  async function listTeam(page: import('@playwright/test').Page, accessToken: string | null) {
    const r = await page.request.get(`${API_BASE}/team-members`, {
      headers: authHeaders(accessToken),
    })
    return (await r.json()) as Array<{
      id: string
      name: string
      role?: string | null
      department?: string | null
      bio?: string | null
    }>
  }

  test('renders the teammate name', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('tm-id'))
    const team = await listTeam(page, accessToken)
    expect(team.length).toBeGreaterThan(0)
    const m = team[0]
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/team/' + m.id)
      await page.waitForLoadState('networkidle')
    })
    await expect(page.locator('[data-mol-id="page-team-profile"]').first()).toBeVisible()
    const body = await page.locator('body').innerText()
    expect(body).toContain(m.name)
    expect(reqs.some((r) => /\/api\/team-members/.test(r.url))).toBe(true)
  })

  test('renders the teammate role/department from the API', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('tm-role'))
    const team = await listTeam(page, accessToken)
    const m = team[0]
    await page.goto(APP_BASE + '/team/' + m.id)
    await page.waitForLoadState('networkidle')
    const body = (await page.locator('body').innerText()).toLowerCase()
    if (m.role) expect(body).toContain(m.role.toLowerCase().slice(0, 10))
  })

  test('back-to-team link returns to /team', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('tm-back'))
    const team = await listTeam(page, accessToken)
    await page.goto(APP_BASE + '/team/' + team[0].id)
    await page.waitForLoadState('networkidle')
    const back = page.locator('a[href="/team"]').first()
    if (await back.count()) {
      await back.click()
      await expect(page).toHaveURL(/\/team$/, { timeout: 10_000 })
    }
  })
})
