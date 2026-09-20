import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, apiHeaders, listProjects, signup, todayKey, waitForSeed } from './_helpers.js'

/**
 * The signature construction flow: open a project → file today's daily log
 * with crew + work entries → file a punch item at a grid location → assign
 * it → close it with the RFI raised, answered, and closed referencing the
 * punch item.
 */
test('daily log → punch item → assignment → closure → RFI thread', async ({ page }) => {
  const { accessToken } = await signup(page)
  await waitForSeed(page, accessToken)
  const projects = await listProjects(page, accessToken)
  const project = projects[0]!

  // 1. Open the project and file today's daily log with crew + an entry.
  await page.goto(`/projects/${project.id}/logs`)
  await expect(page.getByRole('heading', { name: /daily logs/i })).toBeVisible()
  await page.locator('[data-mol-id="daily-logs-new-button"]').click()
  await page.locator('[data-mol-id="daily-logs-field-date"]').fill(todayKey())
  await page.locator('[data-mol-id="daily-logs-field-weather"]').selectOption('sunny')
  await page.locator('[data-mol-id="daily-logs-field-crew"]').fill('18')
  await page.locator('[data-mol-id="daily-logs-field-hours"]').fill('144')
  await page.locator('[data-mol-id="daily-logs-field-notes"]').fill('E2E journey log')
  await page.locator('[data-mol-id="daily-logs-create-submit"]').click()

  const logList = (await (
    await page.request.get(`${API_BASE}/daily-logs?project_id=${project.id}&date=${todayKey()}`, {
      headers: apiHeaders(accessToken),
    })
  ).json()) as Array<{ id: string; crew_count: number; entries: Array<{ area: string }> }>
  const myLog = logList.find((l) => l.crew_count === 18)
  expect(myLog).toBeDefined()

  await page.locator(`[data-mol-id="daily-log-add-entry-${myLog!.id}"]`).click()
  await page.locator('[data-mol-id="daily-logs-entry-area"]').fill('Level 4 — Grid B7')
  await page.locator('[data-mol-id="daily-logs-entry-work"]').fill('E2E: decked the east bay')
  await page.locator('[data-mol-id="daily-logs-entry-submit"]').click()

  // 2. File a punch item at a grid location.
  await page.goto(`/projects/${project.id}/punch`)
  await page.locator('[data-mol-id="punch-new-button"]').click()
  await page.locator('[data-mol-id="punch-field-location"]').fill('Level 4 — Grid B7')
  await page.locator('[data-mol-id="punch-field-severity"]').selectOption('high')
  await page
    .locator('[data-mol-id="punch-field-description"]')
    .fill('E2E: deck edge formwork out of plumb at the punch location')
  await page.locator('[data-mol-id="punch-create-submit"]').click()

  const punchList = (await (
    await page.request.get(`${API_BASE}/punch-items?project_id=${project.id}`, {
      headers: apiHeaders(accessToken),
    })
  ).json()) as Array<{ id: string; location: string; status: string; assignee: string | null }>
  const punch = punchList.find((p) => p.location === 'Level 4 — Grid B7')
  expect(punch).toBeDefined()
  expect(punch?.status).toBe('open')

  // 3. Assign the punch item.
  const punchId = punch!.id
  const row = page.locator(`[data-mol-id="punch-item-${punchId}"]`)
  await expect(row).toBeVisible()
  await row.locator(`[data-mol-id="punch-assign-${punchId}"]`).click()
  await row.locator('[data-mol-id="punch-assign-name"]').fill('E2E Concrete Crew')
  await row.locator('[data-mol-id="punch-assign-submit"]').click()

  // 4. Close it out.
  await row.locator(`[data-mol-id="punch-close-${punchId}"]`).click()
  await expect
    .poll(
      async () => {
        const body = (await (
          await page.request.get(`${API_BASE}/punch-items/${punchId}`, {
            headers: apiHeaders(accessToken),
          })
        ).json()) as { status: string }
        return body.status
      },
      { timeout: 15000 },
    )
    .toBe('closed')

  // 5. Raise an RFI referencing the punch item, answer it, close it.
  await page.goto(`/projects/${project.id}/rfis`)
  await page.locator('[data-mol-id="rfis-new-button"]').click()
  await page.locator('[data-mol-id="rfis-field-title"]').fill('E2E formwork tolerance RFI')
  await page.locator('[data-mol-id="rfis-field-originator"]').fill('E2E Concrete Crew')
  await page.locator('[data-mol-id="rfis-field-drawings"]').fill('S-910')
  await page
    .locator('[data-mol-id="rfis-field-question"]')
    .fill(
      'E2E: referencing the closed punch item at Level 4 Grid B7 — what plumb tolerance applies before re-shoring is released?',
    )
  await page.locator('[data-mol-id="rfis-create-submit"]').click()

  const rfiList = (await (
    await page.request.get(`${API_BASE}/rfis?project_id=${project.id}`, {
      headers: apiHeaders(accessToken),
    })
  ).json()) as Array<{ id: string; title: string; status: string }>
  const rfi = rfiList.find((r) => r.title === 'E2E formwork tolerance RFI')
  expect(rfi).toBeDefined()

  await page.goto(`/projects/${project.id}/rfis/${rfi!.id}`)
  await page
    .locator('[data-mol-id="rfis-response-body"]')
    .fill('E2E final: H/240 tolerance; release re-shoring after 7 days.')
  await page.locator('[data-mol-id="rfis-response-final"]').check()
  await page.locator('[data-mol-id="rfis-response-submit"]').click()
  await expect(page.locator('[data-mol-id="badge-answered"]')).toBeVisible()
  await page.locator('[data-mol-id="rfis-close-button"]').click()
  await expect(page.locator('[data-mol-id="badge-closed"]')).toBeVisible()

  // The project overview still renders with the journey complete.
  await page.goto(`/projects/${project.id}`)
  await expect(page.getByRole('heading', { name: project.name })).toBeVisible()
})
