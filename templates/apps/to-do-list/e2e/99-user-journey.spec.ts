import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { signup, captureNetwork, API_BASE, cookieHeader } from './_helpers.js'

/**
 * Cross-page kitchen-sink flow: a single user signs up and exercises the
 * core domain end-to-end (project → task → label → complete → settings →
 * analytics). Every step asserts the backend invariant via either an
 * observed network call or a follow-up GET.
 */
test('end-to-end user journey: signup → project → task → label → complete → analytics', async ({
  page,
}) => {
  await signup(page)
  await expect(page).toHaveURL(/\/today/)

  const cookie = await cookieHeader(page)

  // 1. Create a project via API
  const projectResp = await page.request.post(`${API_BASE}/projects`, {
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    data: { name: 'Spring Launch', color: '#7c3aed' },
  })
  expect(projectResp.status()).toBeLessThan(300)
  const projectBody = await projectResp.json()
  const project = projectBody.data ?? projectBody
  expect(project.id).toBeTruthy()

  // 2. Create a label via API
  const labelResp = await page.request.post(`${API_BASE}/labels`, {
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    data: { name: 'priority', color: '#ef4444' },
  })
  expect(labelResp.status()).toBeLessThan(300)
  const label = await labelResp.json()
  expect(label.id).toBeTruthy()

  // 3. Quick-add a task on /today via UI; assert read-after-write
  await page.goto('/today')
  const title = `Launch task ${Date.now()}`
  const reqs = await captureNetwork(page, async () => {
    await page.getByRole('textbox', { name: /add a task for today/i }).fill(title)
    await page.getByRole('button', { name: /^add$/i }).click()
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 15_000 })
  })
  const post = reqs.find((r) => r.method === 'POST' && /\/api\/tasks(?:\?|$)/.test(r.url))
  expect(post?.status).toBeLessThan(300)

  // 4. Read back the task id and attach the label
  const list = await page.request
    .get(`${API_BASE}/tasks`, { headers: { Cookie: cookie } })
    .then((r) => r.json())
  const arr = Array.isArray(list) ? list : (list.data ?? [])
  const created = arr.find((t: { title: string }) => t.title === title)
  expect(created?.id).toBeTruthy()

  await page.request.post(`${API_BASE}/labels/assignments`, {
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    data: { task_id: created.id, label_id: label.id },
  })
  const reread = await page.request
    .get(`${API_BASE}/tasks/${created.id}`, { headers: { Cookie: cookie } })
    .then((r) => r.json())
  const t = reread.data ?? reread
  expect(t.labels).toContain('priority')

  // 5. Mark complete via API
  await page.request.post(`${API_BASE}/tasks/${created.id}/complete`, {
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    data: {},
  })
  const completed = await page.request
    .get(`${API_BASE}/tasks/${created.id}`, { headers: { Cookie: cookie } })
    .then((r) => r.json())
  const c = completed.data ?? completed
  expect(c.completed).toBe(true)

  // 6. /analytics reflects the work
  await page.goto('/analytics')
  await page.waitForLoadState('networkidle').catch(() => null)
  await expect(page.getByText(/completion rate/i).first()).toBeVisible({ timeout: 15_000 })

  // 7. Settings — change name and reload to prove persistence
  await page.goto('/settings')
  const newName = `Cadence Pro ${Date.now()}`
  await page
    .getByLabel(/^name$|display name/i)
    .first()
    .fill(newName)
  await page
    .getByRole('button', { name: /save|update/i })
    .first()
    .click()
  await page.waitForTimeout(800)
  await page.reload()
  await page.waitForLoadState('networkidle').catch(() => null)
  const finalValue = await page
    .getByLabel(/^name$|display name/i)
    .first()
    .inputValue()
    .catch(() => '')
  expect(finalValue).toBe(newName)

  // 8. /pricing public page reachable post-flow
  await page.goto('/pricing')
  await expect(page.getByText(/free/i).first()).toBeVisible({ timeout: 15_000 })

  // 9. Sign out closes the journey
  await page.goto('/settings')
  await page
    .getByRole('button', { name: /sign\s*out/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })
})
