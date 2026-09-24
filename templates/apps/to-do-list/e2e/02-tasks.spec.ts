import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { signup, captureNetwork, API_BASE, cookieHeader } from './_helpers.js'

test.describe('tasks', () => {
  test('quick add on /today creates a task with read-after-write', async ({ page }) => {
    await signup(page)
    await page.goto('/today')
    await page.waitForLoadState('networkidle').catch(() => null)

    const title = `Buy ${Date.now()}`
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('textbox', { name: /add a task for today/i }).fill(title)
      await page.getByRole('button', { name: /^add$/i }).click()
      await expect(page.getByText(title).first()).toBeVisible({ timeout: 15_000 })
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/tasks(?:\?|$)/.test(r.url))
    expect(post, 'POST /api/tasks was not observed').toBeTruthy()
    expect(post!.status).toBeLessThan(300)

    // Read-after-write via direct API call.
    const cookie = await cookieHeader(page)
    const list = await page.request
      .get(`${API_BASE}/tasks`, { headers: { Cookie: cookie } })
      .then((r) => r.json())
    const arr = Array.isArray(list) ? list : (list.data ?? [])
    const found = arr.find((t: { title: string }) => t.title === title)
    expect(found, `task "${title}" not present in GET /api/tasks after create`).toBeTruthy()
  })

  test('quick add on /inbox creates a task with project_id=null', async ({ page }) => {
    await signup(page)
    await page.goto('/inbox')
    const title = `Inbox ${Date.now()}`
    await page.getByRole('textbox', { name: /add a task to inbox/i }).fill(title)
    await page.getByRole('button', { name: /^add$/i }).click()
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 15_000 })

    const cookie = await cookieHeader(page)
    const list = await page.request
      .get(`${API_BASE}/tasks?filter=inbox`, { headers: { Cookie: cookie } })
      .then((r) => r.json())
    const arr = Array.isArray(list) ? list : (list.data ?? [])
    const found = arr.find((t: { title: string; project_id: string | null }) => t.title === title)
    expect(found).toBeTruthy()
    expect(found.project_id).toBeNull()
  })

  test('toggling complete persists across reload', async ({ page }) => {
    await signup(page)
    await page.goto('/today')
    const title = `Toggle ${Date.now()}`
    await page.getByRole('textbox', { name: /add a task for today/i }).fill(title)
    await page.getByRole('button', { name: /^add$/i }).click()
    await expect(page.getByText(title).first()).toBeVisible()

    const checkbox = page.getByRole('button', {
      name: new RegExp(`mark "${title}" as complete`, 'i'),
    })
    await checkbox.click()
    await page.waitForTimeout(800)

    // Read-after-write: GET /tasks/today no longer lists the task as
    // outstanding (or it lists it but is_completed=true).
    const cookie = await cookieHeader(page)
    const tasks = await page.request
      .get(`${API_BASE}/tasks`, { headers: { Cookie: cookie } })
      .then((r) => r.json())
    const arr = Array.isArray(tasks) ? tasks : (tasks.data ?? [])
    const target = arr.find((t: { title: string }) => t.title === title)
    expect(target, 'task missing after toggle').toBeTruthy()
    expect(target.completed).toBe(true)
    expect(target.completed_at).toBeTruthy()
  })

  test('opening /tasks/:id shows the task detail and updates persist', async ({ page }) => {
    await signup(page)
    const cookie = await cookieHeader(page)
    const created = await page.request
      .post(`${API_BASE}/tasks`, {
        headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        data: { title: 'Detail probe', priority: 3 },
      })
      .then((r) => r.json())
    const task = created.data ?? created
    expect(task.id).toBeTruthy()

    await page.goto(`/tasks/${task.id}`)
    await page.waitForLoadState('networkidle').catch(() => null)
    await expect(page.locator('h1').filter({ hasText: 'Detail probe' })).toBeVisible({
      timeout: 15_000,
    })

    // Change priority via the select.
    await page.locator('select').first().selectOption('1')
    await page.waitForTimeout(800)

    // Read-after-write
    const reread = await page.request
      .get(`${API_BASE}/tasks/${task.id}`, { headers: { Cookie: cookie } })
      .then((r) => r.json())
    const t = reread.data ?? reread
    expect(t.priority).toBe(1)
  })

  test('deleting a task from /tasks/:id navigates back and removes it', async ({ page }) => {
    await signup(page)
    const cookie = await cookieHeader(page)
    const created = await page.request
      .post(`${API_BASE}/tasks`, {
        headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        data: { title: 'Delete me', priority: 4 },
      })
      .then((r) => r.json())
    const task = created.data ?? created

    await page.goto(`/tasks/${task.id}`)
    await page.waitForLoadState('networkidle').catch(() => null)
    // Two-click arm/commit confirm (shared ConfirmButton): first click arms
    // and shows the confirm label, second click commits the deletion.
    const del = page.locator('[data-mol-id="task-detail-delete"]')
    await del.click()
    await expect(del).toHaveText(/delete this task\?/i)
    await del.click()
    await expect(page).toHaveURL(/\/(inbox|today|projects)/, { timeout: 15_000 })

    const reread = await page.request.get(`${API_BASE}/tasks/${task.id}`, {
      headers: { Cookie: cookie },
    })
    expect(reread.status()).toBe(404)
  })

  test('GET /api/tasks/today, /api/tasks/upcoming, /api/tasks/completed all return arrays', async ({
    page,
  }) => {
    await signup(page)
    const cookie = await cookieHeader(page)
    for (const path of ['tasks/today', 'tasks/upcoming', 'tasks/completed']) {
      const r = await page.request.get(`${API_BASE}/${path}`, { headers: { Cookie: cookie } })
      expect(r.status(), `${path} should be 200`).toBe(200)
      const body = await r.json()
      const list = Array.isArray(body) ? body : (body.data ?? [])
      expect(Array.isArray(list)).toBe(true)
    }
  })

  test('task detail: changing project + recurrence persists (read-after-write)', async ({
    page,
  }) => {
    await signup(page)
    const cookie = await cookieHeader(page)
    const project = await page.request
      .post(`${API_BASE}/projects`, {
        headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        data: { name: 'Detail Edit Project', color: '#4f46e5' },
      })
      .then((r) => r.json())
    const task = await page.request
      .post(`${API_BASE}/tasks`, {
        headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        data: { title: 'Edit me', priority: 4 },
      })
      .then((r) => r.json())

    await page.goto(`/tasks/${task.id}`)
    await page.waitForLoadState('networkidle').catch(() => null)

    // Open project editor and pick our project
    await page.locator('[data-mol-id="task-detail-project"]').click()
    await page
      .locator('[data-mol-id="task-detail-project-select"]')
      .selectOption({ label: 'Detail Edit Project' })
    await expect(page.getByRole('button', { name: 'Detail Edit Project' })).toBeVisible({
      timeout: 15_000,
    })

    // Open recurrence editor and pick weekly
    await page.locator('[data-mol-id="task-detail-recurrence"]').click()
    await page.locator('[data-mol-id="task-detail-recurrence-select"]').selectOption('every 1 week')
    // Wait for the optimistic UI to confirm the change saved
    await expect(page.getByRole('button', { name: /🔁 weekly/i })).toBeVisible({ timeout: 15_000 })

    // Read-after-write — poll briefly because PATCH and GET race each other
    let t: { recurrence_rule: string | null; project?: { id: string }; project_id?: string } = {
      recurrence_rule: null,
    }
    for (let i = 0; i < 10; i++) {
      const reread = await page.request
        .get(`${API_BASE}/tasks/${task.id}`, { headers: { Cookie: cookie } })
        .then((r) => r.json())
      t = reread.data ?? reread
      if (t.recurrence_rule === 'every 1 week') break
      await page.waitForTimeout(200)
    }
    expect(t.project?.id ?? t.project_id).toBe(project.id)
    expect(t.recurrence_rule).toBe('every 1 week')
  })

  test('completing a recurring task spawns the next instance with the rolled-forward due date', async ({
    page,
  }) => {
    await signup(page)
    const cookie = await cookieHeader(page)
    const created = await page.request
      .post(`${API_BASE}/tasks`, {
        headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        data: {
          title: 'Daily standup',
          priority: 2,
          due_date: '2026-05-10',
          recurrence_rule: 'every 1 day',
        },
      })
      .then((r) => r.json())
    expect(created.id).toBeTruthy()

    // Complete via the dedicated endpoint that handles recurrence spawn
    const completed = await page.request.post(`${API_BASE}/tasks/${created.id}/complete`, {
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    })
    expect(completed.status()).toBeLessThan(300)

    // The original is now completed
    const original = await page.request
      .get(`${API_BASE}/tasks/${created.id}`, { headers: { Cookie: cookie } })
      .then((r) => r.json())
    const o = original.data ?? original
    expect(o.completed).toBe(true)

    // A second open task with the same title should exist with due_date rolled forward by 1 day
    const list = await page.request
      .get(`${API_BASE}/tasks`, { headers: { Cookie: cookie } })
      .then((r) => r.json())
    const arr = Array.isArray(list) ? list : (list.data ?? [])
    const next = arr.find(
      (t: { title: string; id: string; completed?: boolean }) =>
        t.title === 'Daily standup' && !t.completed && t.id !== created.id,
    )
    expect(next, 'next instance of recurring task was not spawned').toBeTruthy()
    // The roll-forward must be exactly 1 day forward from the original due date.
    expect(String(next.due_date).slice(0, 10)).toBe('2026-05-11')
  })

  test('POST /api/tasks/reorder accepts a position list and persists (read-after-write)', async ({
    page,
  }) => {
    await signup(page)
    const cookie = await cookieHeader(page)
    const createTask = async (title: string, position: number) => {
      const r = await page.request.post(`${API_BASE}/tasks`, {
        headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        data: { title, priority: 4, position },
      })
      expect(r.status()).toBe(201)
      const body = await r.json()
      return body.data ?? body
    }
    const a = await createTask('Reorder A', 1)
    const b = await createTask('Reorder B', 2)
    expect(a.id).toBeTruthy()
    expect(b.id).toBeTruthy()

    const r = await page.request.post(`${API_BASE}/tasks/reorder`, {
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      data: {
        tasks: [
          { id: b.id, position: 1 },
          { id: a.id, position: 2 },
        ],
      },
    })
    expect(r.status()).toBeLessThan(300)

    // Read-after-write: positions must reflect the swap.
    const aAfter = await page.request
      .get(`${API_BASE}/tasks/${a.id}`, { headers: { Cookie: cookie } })
      .then((r) => r.json())
    const bAfter = await page.request
      .get(`${API_BASE}/tasks/${b.id}`, { headers: { Cookie: cookie } })
      .then((r) => r.json())
    expect(Number(aAfter.position)).toBe(2)
    expect(Number(bAfter.position)).toBe(1)
  })
})
