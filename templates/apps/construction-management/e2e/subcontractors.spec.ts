import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, apiHeaders, listProjects, signup, waitForSeed } from './_helpers.js'

test('subcontractor directory lists seeded trades with committed total', async ({ page }) => {
  const { accessToken } = await signup(page)
  await waitForSeed(page, accessToken)
  const projects = await listProjects(page, accessToken)
  const project = projects[0]!

  const res = await page.request.get(`${API_BASE}/subcontractors?project_id=${project.id}`, {
    headers: apiHeaders(accessToken),
  })
  expect(res.status()).toBe(200)
  const subs = (await res.json()) as Array<{ id: string }>

  await page.goto(`/projects/${project.id}/subs`)
  await expect(page.getByRole('heading', { name: /subcontractors/i })).toBeVisible()
  for (const sub of subs) {
    await expect(page.locator(`[data-mol-id="sub-row-${sub.id}"]`)).toBeVisible()
  }
})

test('adding a subcontractor and activating the invite', async ({ page }) => {
  const { accessToken } = await signup(page)
  await waitForSeed(page, accessToken)
  const projects = await listProjects(page, accessToken)
  const project = projects[0]!

  await page.goto(`/projects/${project.id}/subs`)
  await page.locator('[data-mol-id="subs-new-button"]').click()
  await page.locator('[data-mol-id="subs-field-trade"]').fill('glazing')
  await page.locator('[data-mol-id="subs-field-company"]').fill('E2E Glass Co')
  await page.locator('[data-mol-id="subs-field-contact"]').fill('(555) 000-0000')
  await page.locator('[data-mol-id="subs-field-value"]').fill('450000')
  await page.locator('[data-mol-id="subs-create-submit"]').click()

  const subs = (await (
    await page.request.get(`${API_BASE}/subcontractors?project_id=${project.id}`, {
      headers: apiHeaders(accessToken),
    })
  ).json()) as Array<{ id: string; company: string; status: string; contract_value_cents: number }>
  const mine = subs.find((s) => s.company === 'E2E Glass Co')
  expect(mine).toBeDefined()
  expect(mine?.status).toBe('invited')
  expect(mine?.contract_value_cents).toBe(45_000_000)

  const id = mine!.id
  await page.locator(`[data-mol-id="sub-activate-${id}"]`).click()
  await expect
    .poll(
      async () => {
        const body = (await (
          await page.request.get(`${API_BASE}/subcontractors/${id}`, {
            headers: apiHeaders(accessToken),
          })
        ).json()) as { status: string }
        return body.status
      },
      { timeout: 15000 },
    )
    .toBe('active')
})
