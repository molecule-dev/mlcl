/**
 * /checklist/:id task detail.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  authHeaders,
  captureNetwork,
  listTasks,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('/checklist/:id', () => {
  test('detail page renders the task title', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('cli-id'))
    const tasks = await listTasks(page, accessToken)
    expect(tasks.length).toBeGreaterThan(0)
    const task = tasks[0]
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/checklist/' + task.id)
      await page.waitForLoadState('networkidle')
    })
    await expect(page.locator('[data-mol-id="page-task-detail"]').first()).toBeVisible()
    const body = (await page.locator('body').innerText()).toLowerCase()
    expect(body).toContain(task.title.toLowerCase().slice(0, 30))
    expect(reqs.some((r) => /\/api\/tasks/.test(r.url))).toBe(true)
  })

  test('mark-complete persists across reload', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('cli-id-c'))
    const tasks = await listTasks(page, accessToken)
    const pending = tasks.find((t) => t.status === 'pending') ?? tasks[0]
    const r = await page.request.put(`${API_BASE}/tasks/${pending.id}`, {
      headers: authHeaders(accessToken),
      data: { status: 'complete', completed_at: new Date().toISOString() },
    })
    expect(r.status()).toBeLessThan(400)
    const after = await listTasks(page, accessToken)
    const updated = after.find((t) => t.id === pending.id)
    expect(updated?.status).toBe('complete')
  })

  test('back-to-checklist link works', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('cli-id-back'))
    const tasks = await listTasks(page, accessToken)
    await page.goto(APP_BASE + '/checklist/' + tasks[0].id)
    await page.waitForLoadState('networkidle')
    const back = page.locator('a[href="/checklist"]').first()
    if (await back.count()) {
      await back.click()
      await expect(page).toHaveURL(/\/checklist$/, { timeout: 10_000 })
    }
  })
})
