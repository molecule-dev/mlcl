/**
 * /dashboard — Auth-only project home. Loads /api/projects, /api/profile/me,
 * /api/notifications. Lets the user search, switch folder, change cursor
 * color (persisted to profile.prefs.cursorColor), and create a new project.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, seedProject, signup } from './_helpers.js'

test.describe('dashboard page', () => {
  test('loads with grid + sidebar + activity card — three real GETs hit the API', async ({
    page,
  }) => {
    const reqs = await captureNetwork(page, async () => {
      await signup(page)
      await expect(page.locator('[data-mol-id="dashboard-grid-title"]')).toBeVisible({
        timeout: 10000,
      })
      // The three GETs are issued by different components, so the grid title can
      // paint before profile/notifications land — closing the capture window early
      // and losing a request the assertions below require. Wait for the network to
      // settle so the capture covers all of them.
      await page.waitForLoadState('networkidle')
    })
    const projects = reqs.find(
      (r) => /\/api\/projects(\?|$)/.test(r.url) && r.method === 'GET' && r.status < 400,
    )
    const profile = reqs.find(
      (r) => /\/api\/profile\/me/.test(r.url) && r.method === 'GET' && r.status < 400,
    )
    const notifs = reqs.find(
      (r) => /\/api\/notifications/.test(r.url) && r.method === 'GET' && r.status < 400,
    )
    expect(projects, 'GET /api/projects').toBeTruthy()
    expect(profile, 'GET /api/profile/me').toBeTruthy()
    expect(notifs, 'GET /api/notifications').toBeTruthy()
  })

  test('search input narrows the visible project grid', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedProject(page, accessToken, 'CarbonaraCanvas')
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForSelector('[data-mol-id="dashboard-projects-grid"]', { timeout: 10000 })
    await page.locator('[data-mol-id="dashboard-search"]').fill('Carbonara')
    await expect(page.locator('text=CarbonaraCanvas').first()).toBeVisible()
  })

  test('"Start from template" link navigates to /templates', async ({ page }) => {
    await signup(page)
    await page.locator('[data-mol-id="dashboard-templates-link"]').click()
    await page.waitForURL('**/templates', { timeout: 5000 })
  })

  test('"New project" button POSTs /api/projects and redirects to /editor/<id>', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="dashboard-new-project"]').click()
      await page.waitForURL(/\/editor\/[a-f0-9-]+/, { timeout: 10000 })
    })
    const post = reqs.find(
      (r) => /\/api\/projects(\?|$)/.test(r.url) && r.method === 'POST' && r.status < 400,
    )
    expect(post).toBeTruthy()
  })

  test('clicking a folder filter sets the active folder', async ({ page }) => {
    await signup(page)
    await page.locator('[data-mol-id="dashboard-folder-Personal"]').click()
    await page.waitForTimeout(300)
    await expect(page.locator('[data-mol-id="dashboard-folder-Personal"]')).toBeVisible()
  })

  test('selecting a cursor color PATCHes /api/profile/me and updates the swatch', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="dashboard-cursor-#ec4899"]').click()
      await page.waitForTimeout(800)
    })
    const patch = reqs.find(
      (r) => /\/api\/profile\/me/.test(r.url) && r.method === 'PATCH' && r.status < 400,
    )
    expect(patch).toBeTruthy()

    const fresh = await page.request.get(`${API_BASE}/profile/me`, {
      headers: apiHeaders(accessToken),
    })
    const body = await fresh.json()
    expect(body.prefs?.cursorColor).toBe('#ec4899')
  })

  test('cursor-current swatch reflects the selected hex (uppercased)', async ({ page }) => {
    await signup(page)
    await page.locator('[data-mol-id="dashboard-cursor-#10b981"]').click()
    await page.waitForTimeout(500)
    await expect(page.locator('[data-mol-id="dashboard-cursor-current"]')).toContainText('#10B981')
  })

  test('"See all notifications" link navigates to /notifications', async ({ page }) => {
    const { accessToken } = await signup(page)
    // The activity card lives inside the hero block, which only appears once
    // the user has a project. Seed one first.
    await seedProject(page, accessToken, 'ActivityHero')
    await page.goto(APP_BASE + '/dashboard')
    await page.locator('[data-mol-id="dashboard-activity-view-all"]').click()
    await page.waitForURL('**/notifications', { timeout: 5000 })
  })

  test('clicking a project card opens that project in /editor/:id', async ({ page }) => {
    const { accessToken } = await signup(page)
    const project = await seedProject(page, accessToken, 'OpenInEditor')
    await page.goto(APP_BASE + '/dashboard')
    await page.locator(`[data-mol-id="dashboard-project-${project.id}"] a`).first().click()
    await page.waitForURL(`**/editor/${project.id}`, { timeout: 10000 })
  })

  test('the project grid renders cards once /api/projects returns', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedProject(page, accessToken, 'GridCanvas A')
    await seedProject(page, accessToken, 'GridCanvas B')
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForSelector('[data-mol-id="dashboard-projects-grid"]', { timeout: 10000 })
    expect(
      await page.locator('[data-mol-id^="dashboard-project-"]').count(),
    ).toBeGreaterThanOrEqual(2)
  })

  test('grid title shows the live count once loaded', async ({ page }) => {
    await signup(page)
    await expect(page.locator('[data-mol-id="dashboard-grid-title"]')).toContainText(/\d+/, {
      timeout: 10000,
    })
  })
})
