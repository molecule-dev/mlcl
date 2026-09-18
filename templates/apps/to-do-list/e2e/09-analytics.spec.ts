import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { signup, captureNetwork, API_BASE, cookieHeader } from './_helpers.js'

test.describe('analytics', () => {
  test('/analytics renders the four KPI cards', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto('/analytics')
      await page.waitForLoadState('networkidle').catch(() => null)
      await expect(page.getByText(/total/i).first()).toBeVisible({ timeout: 15_000 })
      await expect(page.getByText(/this week/i)).toBeVisible()
      await expect(page.getByText(/overdue/i)).toBeVisible()
      await expect(page.getByText(/completion rate/i)).toBeVisible()
    })
    const tasksCall = reqs.find((r) => r.method === 'GET' && /\/api\/tasks(?:\?|$)/.test(r.url))
    const projCall = reqs.find((r) => r.method === 'GET' && /\/api\/projects(?:\?|$)/.test(r.url))
    expect(tasksCall, 'GET /api/tasks was not observed during /analytics render').toBeTruthy()
    expect(projCall, 'GET /api/projects was not observed during /analytics render').toBeTruthy()
  })

  test('completion rate updates after marking a task complete (read-after-write)', async ({
    page,
  }) => {
    await signup(page)
    const cookie = await cookieHeader(page)
    const t1 = await page.request
      .post(`${API_BASE}/tasks`, {
        headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        data: { title: 'A1', priority: 4 },
      })
      .then((r) => r.json())
    await page.request.post(`${API_BASE}/tasks`, {
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      data: { title: 'A2', priority: 4 },
    })
    await page.request.post(`${API_BASE}/tasks/${t1.id}/complete`, {
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      data: {},
    })
    await page.goto('/analytics')
    await page.waitForLoadState('networkidle').catch(() => null)
    await expect(page.getByText('50%').first()).toBeVisible({ timeout: 15_000 })
  })

  test('/analytics fetches /api/tasks and /api/projects on render and shows projects breakdown', async ({
    page,
  }) => {
    await signup(page)
    const cookie = await cookieHeader(page)
    const projectResp = await page.request.post(`${API_BASE}/projects`, {
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      data: { name: 'Project Alpha', color: '#ff0000' },
    })
    const projBody = await projectResp.json()
    const project = projBody.data ?? projBody
    // Top-projects breakdown only lists projects that actually have tasks.
    await page.request.post(`${API_BASE}/tasks`, {
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      data: { title: 'Project Alpha kickoff', priority: 4, project_id: project.id },
    })
    const reqs = await captureNetwork(page, async () => {
      await page.goto('/analytics')
      await page.waitForLoadState('networkidle').catch(() => null)
    })
    const tasksGet = reqs.find((r) => r.method === 'GET' && /\/api\/tasks(?:\?|$)/.test(r.url))
    const projGet = reqs.find((r) => r.method === 'GET' && /\/api\/projects(?:\?|$)/.test(r.url))
    expect(tasksGet?.status).toBe(200)
    expect(projGet?.status).toBe(200)
    await expect(page.getByText('Project Alpha').first()).toBeVisible({ timeout: 15_000 })
  })
})
