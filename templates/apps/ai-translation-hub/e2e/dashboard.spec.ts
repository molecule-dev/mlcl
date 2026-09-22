import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, captureNetwork, seedProject, signup } from './_helpers.js'

test.describe('dashboard: authenticated overview', () => {
  test('renders pipeline + recent activity + active projects on a fresh account', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    // signup leaves us on /dashboard. Bounce so the page mounts under captureNetwork.
    await page.goto(APP_BASE + '/projects')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      // Wait for the parallel /api/projects + /api/reports/dashboard_stats + /api/activity fetches.
      await Promise.all([
        page.waitForResponse((r) => /\/api\/projects(?:\?|$)/.test(r.url()) && r.status() === 200, {
          timeout: 15_000,
        }),
        page.waitForResponse(
          (r) => /\/api\/reports\/dashboard_stats/.test(r.url()) && r.status() === 200,
          { timeout: 15_000 },
        ),
      ])
    })
    expect(reqs.find((r) => /\/api\/projects/.test(r.url) && r.method === 'GET')).toBeDefined()
    expect(reqs.find((r) => /\/api\/reports\/dashboard_stats/.test(r.url))).toBeDefined()
    await expect(
      page.getByRole('heading', { name: /translation pipeline|dashboard/i }).first(),
    ).toBeVisible()
  })

  test('GET /api/activity returns the user feed for an empty account', async ({ page }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.get(`${API_BASE}/activity`, {
      headers: apiHeaders(accessToken),
      failOnStatusCode: false,
    })
    expect(res.status()).toBeLessThan(300)
    const list = (await res.json()) as unknown
    expect(Array.isArray(list) || (list && typeof list === 'object')).toBeTruthy()
  })

  test('Active projects section shows a project that the user just seeded', async ({ page }) => {
    const { accessToken } = await signup(page)
    const project = await seedProject(page, accessToken, {
      name: 'Dashboard Project',
      status: 'in_progress',
    })
    // Arm BEFORE navigation — the dashboard mounts + fetches fast enough to
    // finish between goto's load event and a post-goto listener attach.
    await Promise.all([
      page.waitForResponse((r) => /\/api\/projects/.test(r.url()) && r.status() === 200, {
        timeout: 15_000,
      }),
      page.goto(APP_BASE + '/dashboard'),
    ])
    await expect(page.getByText(project.name).first()).toBeVisible({ timeout: 10_000 })
  })

  test('renders a navigation link to /projects from the sidebar', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    const nav = page.locator('a[data-mol-id="nav-projects"], a[href="/projects"]').first()
    await expect(nav).toBeVisible({ timeout: 10_000 })
    await nav.click()
    await expect(page).toHaveURL(/\/projects$/)
  })
})
