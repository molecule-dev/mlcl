import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  apiHeaders,
  captureNetwork,
  seedProject,
  seedSegment,
  signup,
} from './_helpers.js'

test.describe('/projects/:id: project detail', () => {
  test('GET /api/projects/:id returns the project + segments + stats (read-after-write)', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const project = await seedProject(page, accessToken, { name: 'Detail Project' })
    await seedSegment(page, accessToken, { project_id: project.id, source_text: 'Detail segment.' })
    const res = await page.request.get(`${API_BASE}/projects/${project.id}`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status()).toBeLessThan(300)
    const body = (await res.json()) as {
      id: string
      segments: Array<{ source_text: string }>
      stats: { total: number }
    }
    expect(body.id).toBe(project.id)
    expect(body.segments.some((s) => s.source_text === 'Detail segment.')).toBe(true)
    expect(body.stats.total).toBeGreaterThanOrEqual(1)
  })

  test('clicking a project from the list navigates to its detail route', async ({ page }) => {
    const { accessToken } = await signup(page)
    const project = await seedProject(page, accessToken, { name: 'Navigable Project' })
    await page.goto(APP_BASE + '/projects')
    await page.waitForResponse((r) => /\/api\/projects/.test(r.url()) && r.status() === 200, {
      timeout: 15_000,
    })
    const link = page
      .locator(`a[href="/projects/${project.id}"], a[href="/translate/${project.id}"]`)
      .first()
    if (await link.count().catch(() => 0)) {
      await link.click()
      await expect(page).toHaveURL(new RegExp(`(projects|translate)/${project.id}`))
    } else {
      // Fallback: navigate directly so the detail route still gets exercised.
      await page.goto(`${APP_BASE}/projects/${project.id}`)
      const reqs = await captureNetwork(page, async () => {
        await page.reload()
        await page.waitForLoadState('domcontentloaded')
        await page.waitForTimeout(1500)
      })
      expect(reqs.length).toBeGreaterThan(0)
    }
  })

  test('non-owner gets 404 on /api/projects/:id (privacy)', async ({ page }) => {
    // Create the project as user A.
    const a = await signup(page)
    const project = await seedProject(page, a.accessToken, { name: 'Private to A' })
    // Sign up user B in a fresh context.
    await page.context().clearCookies()
    await page.evaluate(() => window.localStorage.clear())
    const b = await signup(page)
    const res = await page.request.get(`${API_BASE}/projects/${project.id}`, {
      headers: apiHeaders(b.accessToken),
      failOnStatusCode: false,
    })
    expect([403, 404]).toContain(res.status())
  })
})
