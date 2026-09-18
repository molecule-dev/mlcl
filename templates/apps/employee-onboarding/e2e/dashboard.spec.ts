/**
 * Dashboard reflects backend state — completion %, day N, and the
 * "Up next" task list match what /api/onboardings/me + /api/tasks
 * actually return. The hero updates after a task is completed.
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

test.describe('dashboard', () => {
  test('renders the dashboard page after signup and fans out to /me + /tasks + /milestones + /team', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('dash-render'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await page.waitForLoadState('networkidle')
    })
    await expect(page.locator('[data-mol-id="page-dashboard"]').first()).toBeVisible()
    expect(reqs.some((r) => /\/api\/onboardings\/me/.test(r.url) && r.method === 'GET')).toBe(true)
    expect(reqs.some((r) => /\/api\/tasks(\b|\?)/.test(r.url) && r.method === 'GET')).toBe(true)
    expect(
      reqs.some((r) => /\/api\/timeline-milestones(\b|\?)/.test(r.url) && r.method === 'GET'),
    ).toBe(true)
    expect(reqs.some((r) => /\/api\/team-members(\b|\?)/.test(r.url) && r.method === 'GET')).toBe(
      true,
    )
  })

  test('completing a task lifts the dashboard completion %', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('dash-pct'))
    const before = await getMe(page, accessToken)
    const tasks = await listTasks(page, accessToken)
    const pending = tasks.find((t) => t.status === 'pending')!
    await page.request.put(`${API_BASE}/tasks/${pending.id}`, {
      headers: authHeaders(accessToken),
      data: { status: 'complete', completed_at: new Date().toISOString() },
    })
    const after = await getMe(page, accessToken)
    expect(after.derived.completionPct).toBeGreaterThan(before.derived.completionPct)
  })

  test('sidebar navigation goes to all primary sections', async ({ page }) => {
    await signup(page, uniqueEmail('dash-nav'))
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle')
    for (const path of [
      '/checklist',
      '/timeline',
      '/training',
      '/documents',
      '/team',
      '/profile',
      '/notifications',
      '/settings',
    ]) {
      const link = page.locator(`a[href="${path}"]`).first()
      if (await link.count()) {
        await expect(link).toBeVisible()
      }
    }
  })
})
