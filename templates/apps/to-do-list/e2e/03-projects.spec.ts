import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { signup, captureNetwork, API_BASE, cookieHeader } from './_helpers.js'

test.describe('projects', () => {
  test('GET /api/projects returns an empty list for a brand-new account', async ({ page }) => {
    await signup(page)
    const cookie = await cookieHeader(page)
    const r = await page.request.get(`${API_BASE}/projects`, { headers: { Cookie: cookie } })
    expect(r.status()).toBe(200)
    const body = await r.json()
    const list = Array.isArray(body) ? body : (body.data ?? [])
    expect(Array.isArray(list)).toBe(true)
    expect(list.length).toBe(0)
  })

  test('POST /api/projects creates a project that appears in the next GET (read-after-write)', async ({
    page,
  }) => {
    await signup(page)
    const cookie = await cookieHeader(page)
    const reqs = await captureNetwork(page, async () => {
      const r = await page.request.post(`${API_BASE}/projects`, {
        headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        data: { name: `Cadence-${Date.now()}`, color: '#4f46e5' },
      })
      expect(r.status()).toBe(201)
    })
    // captureNetwork only catches page-driven traffic; assert via direct GET.
    expect(reqs).toBeDefined()
    const list = await page.request
      .get(`${API_BASE}/projects`, { headers: { Cookie: cookie } })
      .then((r) => r.json())
    const arr = Array.isArray(list) ? list : (list.data ?? [])
    expect(arr.length).toBeGreaterThanOrEqual(1)
  })

  test('PATCH /api/projects/:id updates the name (read-after-write)', async ({ page }) => {
    await signup(page)
    const cookie = await cookieHeader(page)
    const project = await page.request
      .post(`${API_BASE}/projects`, {
        headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        data: { name: 'Old Name', color: '#000000' },
      })
      .then((r) => r.json())
    expect(project.id).toBeTruthy()

    const r = await page.request.patch(`${API_BASE}/projects/${project.id}`, {
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      data: { name: 'New Name' },
    })
    expect(r.status()).toBeLessThan(300)

    const reread = await page.request
      .get(`${API_BASE}/projects/${project.id}`, { headers: { Cookie: cookie } })
      .then((r) => r.json())
    const p = reread.data ?? reread
    expect(p.name).toBe('New Name')
  })

  test('DELETE /api/projects/:id removes the project (404 on next GET)', async ({ page }) => {
    await signup(page)
    const cookie = await cookieHeader(page)
    const project = await page.request
      .post(`${API_BASE}/projects`, {
        headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        data: { name: 'Doomed', color: '#000000' },
      })
      .then((r) => r.json())
    const r = await page.request.delete(`${API_BASE}/projects/${project.id}`, {
      headers: { Cookie: cookie },
    })
    expect(r.status()).toBeLessThan(300)
    const reread = await page.request.get(`${API_BASE}/projects/${project.id}`, {
      headers: { Cookie: cookie },
    })
    expect(reread.status()).toBe(404)
  })

  test('/projects/:id renders the project detail with its tasks', async ({ page }) => {
    await signup(page)
    const cookie = await cookieHeader(page)
    const project = await page.request
      .post(`${API_BASE}/projects`, {
        headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        data: { name: 'UI Project', color: '#4f46e5' },
      })
      .then((r) => r.json())
    await page.request.post(`${API_BASE}/tasks`, {
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      data: { title: 'Project task A', project_id: project.id, priority: 4 },
    })
    await page.goto(`/projects/${project.id}`)
    await page.waitForLoadState('networkidle').catch(() => null)
    await expect(page.locator('h1').filter({ hasText: 'UI Project' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText('Project task A')).toBeVisible({ timeout: 15_000 })
  })
})
