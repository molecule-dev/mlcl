/**
 * Checklist read-after-write invariants. Toggling a task to complete
 * persists across reloads AND updates the dashboard / profile completion
 * counters derived from /api/onboardings/me.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  authHeaders,
  captureNetwork,
  getMe,
  listTasks,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('checklist', () => {
  test('GET /api/tasks returns the seeded checklist on dashboard load', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('cl-fetch'))
    const tasks = await listTasks(page, accessToken)
    expect(tasks.length).toBeGreaterThan(0)
  })

  test('toggling a task complete via API persists & re-reads with completed_at + new completion%', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('cl-complete'))
    const meBefore = await getMe(page, accessToken)
    const tasks = await listTasks(page, accessToken)
    const pending = tasks.find((t) => t.status === 'pending')
    expect(pending, 'expected at least one pending seed task').toBeTruthy()

    const putRes = await page.request.put(`${API_BASE}/tasks/${pending!.id}`, {
      headers: authHeaders(accessToken),
      data: { status: 'complete', completed_at: new Date().toISOString() },
    })
    expect(putRes.status()).toBe(200)

    const reread = await page.request.get(`${API_BASE}/tasks/${pending!.id}`, {
      headers: authHeaders(accessToken),
    })
    const after = (await reread.json()) as { status: string; completed_at: string | null }
    expect(after.status).toBe('complete')
    expect(after.completed_at).toBeTruthy()

    const meAfter = await getMe(page, accessToken)
    expect(meAfter.counts.completedTasks).toBeGreaterThan(meBefore.counts.completedTasks)
    expect(meAfter.derived.completionPct).toBeGreaterThanOrEqual(meBefore.derived.completionPct)
  })

  test('checklist UI renders task titles from the API', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('cl-ui'))
    const tasks = await listTasks(page, accessToken)
    const sample = tasks[0]
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/checklist')
      await page.waitForLoadState('networkidle')
    })
    await expect(page.getByText(sample.title).first()).toBeVisible({ timeout: 10000 })
    expect(reqs.some((r) => /\/api\/tasks(\b|\?)/.test(r.url) && r.method === 'GET')).toBe(true)
  })

  test('toggling a task complete via the checklist UI fires PUT /api/tasks/:id', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('cl-ui-toggle'))
    const tasks = await listTasks(page, accessToken)
    const pending = tasks.find((t) => t.status === 'pending')!
    await page.goto(APP_BASE + `/checklist/${pending.id}`)
    await page.waitForLoadState('networkidle')
    const toggle = page.locator('[data-mol-id="task-toggle-button"]').first()
    await expect(toggle).toBeVisible()
    const [putResp] = await Promise.all([
      page.waitForResponse(
        (r) => /\/api\/tasks\/.+/.test(r.url()) && r.request().method() === 'PUT',
        { timeout: 10_000 },
      ),
      toggle.click(),
    ])
    expect(putResp.status()).toBeLessThan(400)
  })

  test('clicking a checklist task navigates to /checklist/:id and shows task title', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('cl-detail'))
    const tasks = await listTasks(page, accessToken)
    const sample = tasks[0]
    await page.goto(APP_BASE + `/checklist/${sample.id}`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-mol-id="page-task-detail"]').first()).toBeVisible()
    await expect(page.getByRole('heading', { name: sample.title }).first()).toBeVisible()
  })

  test('TaskDetail mark-complete button toggles status and is reflected on re-read', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('cl-toggle-ui'))
    const tasks = await listTasks(page, accessToken)
    const pending = tasks.find((t) => t.status === 'pending')!
    await page.goto(APP_BASE + `/checklist/${pending.id}`)
    await page.waitForLoadState('networkidle')
    const toggle = page.locator('[data-mol-id="task-toggle-button"]').first()
    await expect(toggle).toBeVisible()
    await toggle.click()
    // Wait for the network call + reload.
    await page.waitForLoadState('networkidle')
    const after = await page.request.get(`${API_BASE}/tasks/${pending.id}`, {
      headers: authHeaders(accessToken),
    })
    const data = (await after.json()) as { status: string }
    expect(data.status).toBe('complete')
  })
})
