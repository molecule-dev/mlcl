import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, signup, uniqueEmail } from './_helpers.js'

test.describe('/tasks page', () => {
  test('renders the seeded checklist with a progress bar', async ({ page }) => {
    const email = uniqueEmail('tasks-view')
    const { accessToken } = await signup(page, email)
    await page.goto(APP_BASE + '/tasks')
    await expect(page.locator('[data-mol-id="page-tasks"]')).toBeVisible({ timeout: 15000 })

    const data = (await (
      await page.request.get(`${API_BASE}/tasks`, { headers: apiHeaders(accessToken) })
    ).json()) as { tasks: Array<{ id: string }>; total: number; done: number }
    expect(data.tasks.length).toBeGreaterThan(0)

    await expect(page.locator('[data-mol-id="tasks-pct"]')).toBeVisible()
    for (const task of data.tasks.slice(0, 5)) {
      await expect(page.locator(`[data-mol-id="task-row-${task.id}"]`)).toBeVisible()
    }
  })

  test('add task POSTs with a due date and renders in the list', async ({ page }) => {
    const email = uniqueEmail('tasks-add')
    const { accessToken } = await signup(page, email)
    await page.goto(APP_BASE + '/tasks')
    await expect(page.locator('[data-mol-id="page-tasks"]')).toBeVisible({ timeout: 15000 })

    const title = `E2E task ${Date.now()}`
    await page.locator('[data-mol-id="tasks-form-title"]').fill(title)
    await page.locator('[data-mol-id="tasks-form-due"]').fill('2027-01-15')
    // Arm the POST waiter BEFORE clicking submit — the API readback below must
    // not race the form's own request.
    const posted = page.waitForResponse(
      (r) => /\/api\/tasks(\?|$)/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 15000 },
    )
    await page.locator('[data-mol-id="tasks-form-submit"]').click()
    expect((await posted).status()).toBeLessThan(400)

    const data = (await (
      await page.request.get(`${API_BASE}/tasks`, { headers: apiHeaders(accessToken) })
    ).json()) as { tasks: Array<{ id: string; title: string; due_date: string | null }> }
    const created = data.tasks.find((x) => x.title === title)
    expect(created?.due_date).toBe('2027-01-15')
    await expect(page.locator(`[data-mol-id="task-row-${created?.id}"]`)).toBeVisible({
      timeout: 10000,
    })
  })

  test('toggling a checkbox PUTs /toggle and updates progress', async ({ page }) => {
    const email = uniqueEmail('tasks-toggle')
    const { accessToken } = await signup(page, email)

    // Seed via the API BEFORE the page loads — the list renders from the
    // page's own initial fetch, so a task added afterwards never shows its
    // checkbox until a reload. GET /wedding first so the lazily-seeded
    // starter kit exists for the POST.
    await page.request.get(`${API_BASE}/wedding`, { headers: apiHeaders(accessToken) })
    const created = await page.request.post(`${API_BASE}/tasks`, {
      headers: apiHeaders(accessToken),
      data: { title: `Toggle me ${Date.now()}` },
    })
    const task = (await created.json()) as { id: string; done: boolean }

    await page.goto(APP_BASE + '/tasks')
    await expect(page.locator('[data-mol-id="page-tasks"]')).toBeVisible({ timeout: 15000 })

    const box = page.locator(`[data-mol-id="task-toggle-${task.id}"]`)
    await expect(box).toBeVisible({ timeout: 10000 })
    // Arm the PUT waiter BEFORE checking — the API readback below must not
    // race the optimistic UI's own request.
    const toggled = page.waitForResponse(
      (r) => /\/api\/tasks\/[^/]+\/toggle(\?|$)/.test(r.url()) && r.request().method() === 'PUT',
      { timeout: 15000 },
    )
    await box.check()
    expect((await toggled).status()).toBeLessThan(400)

    const data = (await (
      await page.request.get(`${API_BASE}/tasks`, { headers: apiHeaders(accessToken) })
    ).json()) as { tasks: Array<{ id: string; done: boolean }> }
    expect(data.tasks.find((x) => x.id === task.id)?.done).toBe(true)
  })

  test('open/done filters narrow the rendered list', async ({ page }) => {
    const email = uniqueEmail('tasks-filter')
    const { accessToken } = await signup(page, email)
    await page.goto(APP_BASE + '/tasks')
    await expect(page.locator('[data-mol-id="page-tasks"]')).toBeVisible({ timeout: 15000 })

    const data = (await (
      await page.request.get(`${API_BASE}/tasks`, { headers: apiHeaders(accessToken) })
    ).json()) as { tasks: Array<{ done: boolean }> }
    const openCount = data.tasks.filter((x) => !x.done).length

    await page.locator('[data-mol-id="tasks-filter-open"]').click()
    const rows = page.locator('[data-mol-id^="task-row-"]')
    await expect(rows).toHaveCount(openCount, { timeout: 10000 })
  })
})
