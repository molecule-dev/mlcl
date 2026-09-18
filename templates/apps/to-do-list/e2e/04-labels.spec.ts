import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { signup, captureNetwork, API_BASE, cookieHeader } from './_helpers.js'

test.describe('labels', () => {
  test('/labels renders the empty state on a fresh account', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto('/labels')
      await page.waitForLoadState('networkidle').catch(() => null)
      await expect(page.getByText(/no labels yet/i)).toBeVisible({ timeout: 15_000 })
    })
    const list = reqs.find((r) => r.method === 'GET' && /\/api\/labels(?:\?|$)/.test(r.url))
    expect(list, 'GET /api/labels was not observed').toBeTruthy()
    expect(list!.status).toBe(200)
  })

  test('creating a label persists across reload (UI flow)', async ({ page }) => {
    await signup(page)
    await page.goto('/labels')
    await page.waitForLoadState('networkidle').catch(() => null)

    const labelName = `tag${Date.now()}`
    await page.getByRole('button', { name: /new label/i }).click()
    await page.locator('#label-new-name').fill(labelName)
    await page.getByRole('button', { name: /create label/i }).click()
    await expect(page.getByText(`@${labelName}`).first()).toBeVisible({ timeout: 15_000 })

    await page.reload()
    await page.waitForLoadState('networkidle').catch(() => null)
    await expect(page.getByText(`@${labelName}`).first()).toBeVisible({ timeout: 15_000 })
  })

  test('POST → PATCH → DELETE /api/labels lifecycle on the API', async ({ page }) => {
    await signup(page)
    const cookie = await cookieHeader(page)
    const created = await page.request
      .post(`${API_BASE}/labels`, {
        headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        data: { name: 'apistage', color: '#ff0000' },
      })
      .then((r) => r.json())
    expect(created.id).toBeTruthy()

    const patch = await page.request.patch(`${API_BASE}/labels/${created.id}`, {
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      data: { name: 'apistage2' },
    })
    expect(patch.status()).toBeLessThan(300)

    const list = await page.request
      .get(`${API_BASE}/labels`, { headers: { Cookie: cookie } })
      .then((r) => r.json())
    const arr = Array.isArray(list) ? list : (list.data ?? [])
    const found = arr.find((l: { name: string; id: string }) => l.id === created.id)
    expect(found?.name).toBe('apistage2')

    const del = await page.request.delete(`${API_BASE}/labels/${created.id}`, {
      headers: { Cookie: cookie },
    })
    expect(del.status()).toBeLessThan(300)

    const list2 = await page.request
      .get(`${API_BASE}/labels`, { headers: { Cookie: cookie } })
      .then((r) => r.json())
    const arr2 = Array.isArray(list2) ? list2 : (list2.data ?? [])
    expect(arr2.find((l: { id: string }) => l.id === created.id)).toBeFalsy()
  })

  test('UI flow: assign a label from the task detail page persists and survives reload', async ({
    page,
  }) => {
    await signup(page)
    const cookie = await cookieHeader(page)
    const label = await page.request
      .post(`${API_BASE}/labels`, {
        headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        data: { name: 'uitag', color: '#4f46e5' },
      })
      .then((r) => r.json())
    const task = await page.request
      .post(`${API_BASE}/tasks`, {
        headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        data: { title: 'Needs a label', priority: 4 },
      })
      .then((r) => r.json())

    await page.goto(`/tasks/${task.id}`)
    await page.waitForLoadState('networkidle').catch(() => null)
    await page.getByRole('button', { name: /\+ add label/i }).click()
    await page.locator('[data-mol-id="task-detail-label-option-uitag"]').click()
    await expect(page.getByRole('button', { name: /remove label uitag/i })).toBeVisible({
      timeout: 15_000,
    })

    // Read-after-write at the API level
    const reread = await page.request
      .get(`${API_BASE}/tasks/${task.id}`, { headers: { Cookie: cookie } })
      .then((r) => r.json())
    const t = reread.data ?? reread
    expect(t.labels).toContain('uitag')

    // Reload the page → chip still there
    await page.reload()
    await expect(page.getByRole('button', { name: /remove label uitag/i })).toBeVisible({
      timeout: 15_000,
    })

    // Detach via the chip
    await page.getByRole('button', { name: /remove label uitag/i }).click()
    await page.waitForFunction(
      () => !document.querySelector('[data-mol-id="task-detail-label-uitag"]'),
      { timeout: 5_000 },
    )
    const after = await page.request
      .get(`${API_BASE}/tasks/${task.id}`, { headers: { Cookie: cookie } })
      .then((r) => r.json())
    const t2 = after.data ?? after
    expect(t2.labels).not.toContain('uitag')
  })

  test('POST /api/labels/assignments attaches a label to a task and the task surfaces it', async ({
    page,
  }) => {
    await signup(page)
    const cookie = await cookieHeader(page)
    const label = await page.request
      .post(`${API_BASE}/labels`, {
        headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        data: { name: 'urgent2', color: '#000' },
      })
      .then((r) => r.json())
    const task = await page.request
      .post(`${API_BASE}/tasks`, {
        headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        data: { title: 'Tagged task', priority: 4 },
      })
      .then((r) => r.json())
    const r = await page.request.post(`${API_BASE}/labels/assignments`, {
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      data: { task_id: task.id, label_id: label.id },
    })
    expect(r.status()).toBeLessThan(300)

    const reread = await page.request
      .get(`${API_BASE}/tasks/${task.id}`, { headers: { Cookie: cookie } })
      .then((r) => r.json())
    const t = reread.data ?? reread
    expect(Array.isArray(t.labels)).toBe(true)
    expect(t.labels).toContain('urgent2')

    // DELETE the assignment via querystring
    const del = await page.request.delete(
      `${API_BASE}/labels/assignments?task_id=${task.id}&label_id=${label.id}`,
      { headers: { Cookie: cookie } },
    )
    expect(del.status()).toBeLessThan(300)
    const after = await page.request
      .get(`${API_BASE}/tasks/${task.id}`, { headers: { Cookie: cookie } })
      .then((r) => r.json())
    const t2 = after.data ?? after
    expect(t2.labels).not.toContain('urgent2')
  })
})
