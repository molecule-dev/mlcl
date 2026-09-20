import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, apiHeaders, listProjects, signup, todayKey, waitForSeed } from './_helpers.js'

test('daily logs page shows the seeded field records', async ({ page }) => {
  const { accessToken } = await signup(page)
  await waitForSeed(page, accessToken)
  const projects = await listProjects(page, accessToken)
  const project = projects[0]!

  const res = await page.request.get(`${API_BASE}/daily-logs?project_id=${project.id}`, {
    headers: apiHeaders(accessToken),
  })
  expect(res.status()).toBe(200)
  const logs = (await res.json()) as Array<{ id: string }>
  expect(logs.length).toBeGreaterThan(0)

  await page.goto(`/projects/${project.id}/logs`)
  await expect(page.getByRole('heading', { name: /daily logs/i })).toBeVisible()
  for (const log of logs) {
    await expect(page.locator(`[data-mol-id="daily-log-${log.id}"]`)).toBeVisible()
  }
})

test('filing a daily log with crew and a work entry through the form', async ({ page }) => {
  const { accessToken } = await signup(page)
  await waitForSeed(page, accessToken)
  const projects = await listProjects(page, accessToken)
  const project = projects[0]!

  await page.goto(`/projects/${project.id}/logs`)
  await page.locator('[data-mol-id="daily-logs-new-button"]').click()
  await page.locator('[data-mol-id="daily-logs-field-date"]').fill(todayKey())
  await page.locator('[data-mol-id="daily-logs-field-weather"]').selectOption('rain')
  await page.locator('[data-mol-id="daily-logs-field-crew"]').fill('12')
  await page.locator('[data-mol-id="daily-logs-field-hours"]').fill('96')
  await page.locator('[data-mol-id="daily-logs-field-notes"]').fill('E2E test log entry')
  await page.locator('[data-mol-id="daily-logs-create-submit"]').click()

  // The new log appears on the page and via the API for today's date.
  const res = await page.request.get(
    `${API_BASE}/daily-logs?project_id=${project.id}&date=${todayKey()}`,
    { headers: apiHeaders(accessToken) },
  )
  expect(res.status()).toBe(200)
  const logs = (await res.json()) as Array<{ crew_count: number; hours: number; notes: string }>
  const mine = logs.find((l) => l.notes === 'E2E test log entry')
  expect(mine).toBeDefined()
  expect(mine?.crew_count).toBe(12)
  expect(mine?.hours).toBe(96)

  // Add a work-performed entry from the log card.
  const logRes = await page.request.get(
    `${API_BASE}/daily-logs?project_id=${project.id}&date=${todayKey()}`,
    { headers: apiHeaders(accessToken) },
  )
  const rows = (await logRes.json()) as Array<{ id: string }>
  const logId = rows.find((r) => r.id)?.id
  expect(logId).toBeTruthy()
  await page.locator(`[data-mol-id="daily-log-add-entry-${logId}"]`).click()
  await page.locator('[data-mol-id="daily-logs-entry-area"]').fill('Level 5 — Grid A1')
  await page
    .locator('[data-mol-id="daily-logs-entry-work"]')
    .fill('E2E: framed the north wall opening')
  await page.locator('[data-mol-id="daily-logs-entry-submit"]').click()

  const detail = await page.request.get(`${API_BASE}/daily-logs/${logId}`, {
    headers: apiHeaders(accessToken),
  })
  const detailBody = (await detail.json()) as { entries: Array<{ area: string }> }
  expect(detailBody.entries.some((e) => e.area === 'Level 5 — Grid A1')).toBe(true)
})
