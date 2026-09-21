import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  apiHeaders,
  armCreateWait,
  listProjects,
  signup,
  waitForSeed,
} from './_helpers.js'

test('RFI list shows seeded items with status filters', async ({ page }) => {
  const { accessToken } = await signup(page)
  await waitForSeed(page, accessToken)
  const projects = await listProjects(page, accessToken)
  const project = projects[0]!

  const res = await page.request.get(`${API_BASE}/rfis?project_id=${project.id}`, {
    headers: apiHeaders(accessToken),
  })
  expect(res.status()).toBe(200)
  const rfis = (await res.json()) as Array<{ id: string; number: number; status: string }>

  await page.goto(`/projects/${project.id}/rfis`)
  await expect(page.getByRole('heading', { name: /RFIs/i })).toBeVisible()
  for (const rfi of rfis) {
    await expect(page.locator(`[data-mol-id="rfi-row-${rfi.id}"]`)).toBeVisible()
  }

  await page.locator('[data-mol-id="rfis-filter-open"]').click()
  const visible = await page.locator('[data-mol-id^="rfi-row-"]').count()
  expect(visible).toBeGreaterThan(0)
})

test('raising an RFI through the form assigns the next sequential number', async ({ page }) => {
  const { accessToken } = await signup(page)
  await waitForSeed(page, accessToken)
  const projects = await listProjects(page, accessToken)
  const project = projects[0]!

  const before = (await (
    await page.request.get(`${API_BASE}/rfis?project_id=${project.id}`, {
      headers: apiHeaders(accessToken),
    })
  ).json()) as Array<{ number: number }>
  const maxNumber = before.reduce((m, r) => Math.max(m, r.number), 0)

  await page.goto(`/projects/${project.id}/rfis`)
  await page.locator('[data-mol-id="rfis-new-button"]').click()
  await page.locator('[data-mol-id="rfis-field-title"]').fill('E2E guardrail clearance')
  await page.locator('[data-mol-id="rfis-field-originator"]').fill('E2E Superintendent')
  await page.locator('[data-mol-id="rfis-field-drawings"]').fill('S-909')
  await page
    .locator('[data-mol-id="rfis-field-question"]')
    .fill('E2E: confirm the guardrail height detail at the ramp edge.')
  const rfiCreated = armCreateWait(page, /\/api\/rfis(\?|$)/)
  await page.locator('[data-mol-id="rfis-create-submit"]').click()
  const rfiResp = await rfiCreated
  expect(rfiResp.status(), `POST /api/rfis → ${rfiResp.status()}`).toBeLessThan(400)

  const after = (await (
    await page.request.get(`${API_BASE}/rfis?project_id=${project.id}`, {
      headers: apiHeaders(accessToken),
    })
  ).json()) as Array<{ number: number; title: string; status: string }>
  const mine = after.find((r) => r.title === 'E2E guardrail clearance')
  expect(mine).toBeDefined()
  expect(mine?.number).toBe(maxNumber + 1)
  expect(mine?.status).toBe('open')
})
