import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, apiHeaders, listProjects, signup, waitForSeed } from './_helpers.js'

/** Create an RFI through the API — the starting point for thread tests. */
async function createRfi(
  page: { request: import('@playwright/test').APIRequestContext },
  accessToken: string,
  projectId: string,
): Promise<{ id: string; number: number }> {
  const res = await page.request.post(`${API_BASE}/rfis`, {
    headers: apiHeaders(accessToken),
    data: {
      project_id: projectId,
      title: 'E2E thread test RFI',
      question: 'E2E: which detail governs the flashing termination?',
      originator: 'E2E Superintendent',
    },
  })
  expect(res.status(), await res.text()).toBe(201)
  return (await res.json()) as { id: string; number: number }
}

test('RFI detail renders the question and a threaded answer flow', async ({ page }) => {
  const { accessToken } = await signup(page)
  await waitForSeed(page, accessToken)
  const projects = await listProjects(page, accessToken)
  const project = projects[0]!
  const rfi = await createRfi(page, accessToken, project.id)

  await page.goto(`/projects/${project.id}/rfis/${rfi.id}`)
  await expect(page.getByRole('heading', { name: /E2E thread test RFI/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /answers & clarifications/i })).toBeHidden()

  // Add a clarification (not final).
  await page
    .locator('[data-mol-id="rfis-response-body"]')
    .fill('E2E clarification: sketch attached')
  await page.locator('[data-mol-id="rfis-response-submit"]').click()
  await expect(page.locator('[data-mol-id^="rfi-response-"]').first()).toBeVisible()

  // The final answer flips the RFI to answered.
  await page.locator('[data-mol-id="rfis-response-body"]').fill('E2E final answer per detail 7')
  await page.locator('[data-mol-id="rfis-response-final"]').check()
  await page.locator('[data-mol-id="rfis-response-submit"]').click()
  await expect(page.locator('[data-mol-id="rfi-final-marker"]').first()).toBeVisible()
  await expect(page.locator('[data-mol-id="badge-answered"]')).toBeVisible()

  // Close it — the decision of record is locked.
  await page.locator('[data-mol-id="rfis-close-button"]').click()
  await expect(page.locator('[data-mol-id="badge-closed"]')).toBeVisible()
  await expect(page.getByText(/decision of record/i)).toBeVisible()

  const after = (await (
    await page.request.get(`${API_BASE}/rfis/${rfi.id}`, { headers: apiHeaders(accessToken) })
  ).json()) as { status: string; responses: Array<{ is_final: boolean }> }
  expect(after.status).toBe('closed')
  expect(after.responses.some((r) => r.is_final)).toBe(true)
})

test('RFI numbering continues per project after API-created RFIs', async ({ page }) => {
  const { accessToken } = await signup(page)
  await waitForSeed(page, accessToken)
  const projects = await listProjects(page, accessToken)
  const project = projects[0]!

  const first = await createRfi(page, accessToken, project.id)
  const second = await createRfi(page, accessToken, project.id)
  expect(second.number).toBe(first.number + 1)
})
