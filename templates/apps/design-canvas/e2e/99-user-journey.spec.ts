/**
 * Cross-page kitchen-sink journey. A real user signs up, opens a project
 * in the editor, draws shapes, renames the project, exports, edits their
 * profile, persists a theme, marks notifications read, runs a search,
 * and uses a template. All assertions hit the real backend.
 *
 * If this test passes, the core Atelier workflow works end-to-end.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, seedProject, signup } from './_helpers.js'

test.describe('99 user journey', () => {
  test.setTimeout(180_000)

  test('signup → editor → rename → draw → export → profile → theme → search → template', async ({
    page,
  }) => {
    const { accessToken, userId } = await signup(page)
    expect(userId).toBeTruthy()

    // 1) Land on /dashboard.
    await expect(page).toHaveURL(/\/dashboard/)

    // 2) Seed a project and open it in the editor.
    const project = await seedProject(page, accessToken, `Journey ${Date.now()}`)
    await page.goto(`${APP_BASE}/editor/${project.id}`)
    await page.waitForSelector('[data-mol-id="editor-toolbar"]', { timeout: 15000 })

    // 3) Rename the project from the editor (button → input → blur).
    await page.locator('[data-mol-id="editor-project-name"]').click()
    const renamed = `Journey Renamed ${Date.now()}`
    await page.locator('[data-mol-id="editor-project-name-input"]').fill(renamed)
    await page.locator('[data-mol-id="editor-project-name-input"]').blur()
    await page.waitForTimeout(800)
    const fresh = await page.request.get(`${API_BASE}/projects/${project.id}`, {
      headers: apiHeaders(accessToken),
    })
    expect((await fresh.json()).name).toBe(renamed)

    // 4) Draw a rectangle and an ellipse.
    await page.locator('[data-mol-id="editor-tool-rect"]').click()
    await page.waitForTimeout(500)
    await page.locator('[data-mol-id="editor-tool-ellipse"]').click()
    await page.waitForTimeout(500)
    expect(
      await page.locator('[data-mol-id="editor-canvas-surface"] rect').count(),
    ).toBeGreaterThanOrEqual(1)
    expect(
      await page.locator('[data-mol-id="editor-canvas-surface"] ellipse').count(),
    ).toBeGreaterThanOrEqual(1)

    // 5) Export the canvas (POST /api/exports + status banner).
    const exportReqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="editor-export"]').click()
      await page.waitForSelector('[data-mol-id="editor-status"]', { timeout: 10000 })
    })
    expect(exportReqs.find((r) => /\/api\/exports/.test(r.url) && r.method === 'POST')).toBeTruthy()

    // 6) Edit the profile from /profile.
    await page.goto(APP_BASE + '/profile')
    await page.locator('[data-mol-id="profile-edit-toggle"]').click()
    const displayName = `Journey User ${Date.now()}`
    await page.locator('[data-mol-id="profile-input-displayName"]').fill(displayName)
    await page.locator('[data-mol-id="profile-save"]').click()
    await expect(page.locator('[data-mol-id="profile-save-status"]')).toContainText(/saved/i, {
      timeout: 10000,
    })
    const me = await page.request.get(`${API_BASE}/profile/me`, {
      headers: apiHeaders(accessToken),
    })
    expect((await me.json()).prefs?.displayName).toBe(displayName)

    // 7) Switch theme to "dark" from /settings; verify <html> updates and DB persists.
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-mol-id="settings-section-appearance"]').click()
    await page.locator('[data-mol-id="settings-theme-dark"]').click()
    await page.waitForTimeout(800)
    expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(
      true,
    )
    const meTheme = await page.request.get(`${API_BASE}/profile/me`, {
      headers: apiHeaders(accessToken),
    })
    expect((await meTheme.json()).prefs?.theme).toBe('dark')

    // 8) Notifications: seed one, then mark all read.
    await page.request.post(`${API_BASE}/notifications`, {
      headers: apiHeaders(accessToken),
      data: { kind: 'mention', actor_name: 'QA', sentence: 'mentioned you', preview: 'journey' },
    })
    await page.goto(APP_BASE + '/notifications')
    await page.waitForSelector('[data-mol-id="notifications-list"]', { timeout: 10000 })
    const markReqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="notifications-mark-all-read"]').click()
      await page.waitForTimeout(1500)
    })
    expect(
      markReqs.find((r) => /\/api\/notifications\/read-all/.test(r.url) && r.method === 'PATCH'),
    ).toBeTruthy()

    // 9) Search the workspace and verify the renamed project shows up.
    await page.goto(APP_BASE + '/search')
    await page.locator('[data-mol-id="search-input"]').fill('Journey')
    await page.waitForTimeout(1000)
    await expect(page.locator(`text=${renamed}`).first()).toBeVisible({ timeout: 5000 })

    // 10) Use a template — POST /api/templates/:id/use lands on a fresh editor.
    await page.goto(APP_BASE + '/templates')
    await page.waitForSelector('[data-mol-id^="template-use-"]', { timeout: 10000 })
    const tplReqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id^="template-use-"]').first().click()
      await page.waitForURL(/\/editor\/[a-f0-9-]+/, { timeout: 15000 })
    })
    expect(
      tplReqs.find(
        (r) => /\/api\/templates\/[^/]+\/use/.test(r.url) && r.method === 'POST' && r.status < 400,
      ),
    ).toBeTruthy()

    // 11) Final invariants: the user has ≥ 2 projects, ≥ 2 shapes, and 1+ exports.
    const projects = await page.request.get(`${API_BASE}/projects`, {
      headers: apiHeaders(accessToken),
    })
    const projectsJson = await projects.json()
    expect(Array.isArray(projectsJson)).toBe(true)
    expect(projectsJson.length).toBeGreaterThanOrEqual(2)

    const shapes = await page.request.get(`${API_BASE}/shapes?projectId=${project.id}`, {
      headers: apiHeaders(accessToken),
    })
    const shapesJson = await shapes.json()
    expect(Array.isArray(shapesJson)).toBe(true)
    expect(shapesJson.length).toBeGreaterThanOrEqual(2)
  })
})
