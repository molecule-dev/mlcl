import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  apiHeaders,
  armCreateWait,
  listProjects,
  signup,
  waitForSeed,
} from './_helpers.js'

test('punch list shows seeded items with severity and status chips', async ({ page }) => {
  const { accessToken } = await signup(page)
  await waitForSeed(page, accessToken)
  const projects = await listProjects(page, accessToken)
  const project = projects[0]!

  const res = await page.request.get(`${API_BASE}/punch-items?project_id=${project.id}`, {
    headers: apiHeaders(accessToken),
  })
  expect(res.status()).toBe(200)
  const items = (await res.json()) as Array<{ id: string }>

  await page.goto(`/projects/${project.id}/punch`)
  await expect(page.getByRole('heading', { name: /punch list/i })).toBeVisible()
  for (const item of items.slice(0, 5)) {
    await expect(page.locator(`[data-mol-id="punch-item-${item.id}"]`)).toBeVisible()
  }
})

test('file a punch item, assign it, and close it out', async ({ page }) => {
  const { accessToken } = await signup(page)
  await waitForSeed(page, accessToken)
  const projects = await listProjects(page, accessToken)
  const project = projects[0]!

  await page.goto(`/projects/${project.id}/punch`)
  await page.locator('[data-mol-id="punch-new-button"]').click()
  await page.locator('[data-mol-id="punch-field-location"]').fill('Level 3 — Grid D2')
  await page.locator('[data-mol-id="punch-field-severity"]').selectOption('high')
  await page
    .locator('[data-mol-id="punch-field-description"]')
    .fill('E2E: guard rail loose at the slab edge')
  const punchCreated = armCreateWait(page, /\/api\/punch-items(\?|$)/)
  await page.locator('[data-mol-id="punch-create-submit"]').click()
  const punchResp = await punchCreated
  expect(punchResp.status(), `POST /api/punch-items → ${punchResp.status()}`).toBeLessThan(400)

  const listRes = await page.request.get(`${API_BASE}/punch-items?project_id=${project.id}`, {
    headers: apiHeaders(accessToken),
  })
  const items = (await listRes.json()) as Array<{
    id: string
    location: string
    status: string
    assignee: string | null
  }>
  const mine = items.find((i) => i.location === 'Level 3 — Grid D2')
  expect(mine).toBeDefined()
  expect(mine?.status).toBe('open')

  const id = mine!.id
  const row = page.locator(`[data-mol-id="punch-item-${id}"]`)
  await expect(row).toBeVisible()

  // Assign through the inline form.
  await row.locator(`[data-mol-id="punch-assign-${id}"]`).click()
  await row.locator('[data-mol-id="punch-assign-name"]').fill('E2E Safety Crew')
  await row.locator('[data-mol-id="punch-assign-submit"]').click()

  // Close it out.
  await row.locator(`[data-mol-id="punch-close-${id}"]`).click()

  await expect
    .poll(
      async () => {
        const res = await page.request.get(`${API_BASE}/punch-items/${id}`, {
          headers: apiHeaders(accessToken),
        })
        const body = (await res.json()) as {
          status: string
          assignee: string | null
          closed_at: string | null
        }
        return body.status
      },
      { timeout: 15000 },
    )
    .toBe('closed')

  const closed = (await (
    await page.request.get(`${API_BASE}/punch-items/${id}`, { headers: apiHeaders(accessToken) })
  ).json()) as { assignee: string | null; closed_at: string | null }
  expect(closed.assignee).toBe('E2E Safety Crew')
  expect(closed.closed_at).not.toBeNull()
})

test('status filter narrows the visible items', async ({ page }) => {
  const { accessToken } = await signup(page)
  await waitForSeed(page, accessToken)
  const projects = await listProjects(page, accessToken)
  const project = projects[0]!

  await page.goto(`/projects/${project.id}/punch`)
  await page.locator('[data-mol-id="punch-filter-closed"]').click()
  const badges = page.locator('[data-mol-id^="badge-closed"]')
  const count = await badges.count()
  for (let i = 0; i < count; i++) {
    await expect(badges.nth(i)).toBeVisible()
  }
})
