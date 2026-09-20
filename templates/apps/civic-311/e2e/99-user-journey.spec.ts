import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  authHeaders,
  captureNetwork,
  seedIssue,
  seedWatchArea,
  signup,
  TINY_PNG,
} from './_helpers.js'

// The civic-311 signature flow, end to end:
//   A watches a corner → B reports a pothole there (photo + pin) → the
//   duplicate suggestion appears (A's earlier report is 2 blocks away) →
//   B submits anyway → staff advances the workflow with an official note →
//   A confirms B's report → both sides see it in their feeds.
test('signature journey: watch → report w/ photo + duplicate → workflow → confirm → notify', async ({
  page,
}) => {
  // --- User A: files the original pothole and watches the corner. ---
  const a = await signup(page)
  await seedIssue(page, a.accessToken, {
    category: 'pothole',
    description: 'Existing bike-lane pothole at the corner.',
    x: 34,
    y: 27,
  })
  await seedWatchArea(page, a.accessToken, { name: 'The corner', x: 34, y: 27, radius: 8 })

  // --- User B: reports a nearby pothole with photo + pin. ---
  await page.evaluate(() => window.localStorage.clear())
  await page.context().clearCookies()
  const b = await signup(page)
  expect(b.userId).not.toBe(a.userId)
  await page.goto(APP_BASE + '/report')
  await page.getByTestId('report-category-pothole').click()
  await page.getByTestId('report-description').fill('Second pothole just past the crosswalk.')
  await page.getByTestId('report-photo').setInputFiles({
    name: 'journey-pothole.png',
    mimeType: 'image/png',
    buffer: TINY_PNG,
  })
  await expect(page.getByTestId('report-photo-attached')).toBeVisible({ timeout: 15_000 })
  const map = page.getByTestId('report-map')
  const box = (await map.boundingBox())!
  await page.mouse.click(box.x + box.width * 0.36, box.y + box.height * 0.29)

  // Duplicate suggestion for A's open report appears…
  await expect(page.getByTestId('report-duplicates')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('report-duplicate-item').first()).toContainText(
    'Existing bike-lane pothole',
  )
  // …submit is gated until acknowledged, then goes through anyway.
  const submit = page.getByTestId('report-submit')
  await expect(submit).toBeDisabled()
  await page.getByTestId('report-duplicates-acknowledge').check()
  const reqs = await captureNetwork(page, async () => {
    await submit.click()
    await expect(page).toHaveURL(/\/reports\/[0-9a-f-]{8,}$/i, { timeout: 15_000 })
  })
  expect(reqs.some((r) => r.method === 'POST' && r.url.includes('/api/issues'))).toBe(true)
  const issueId = page.url().split('/').pop() as string

  // --- Staff (A promoted) advances the workflow with an official note. ---
  await page.request.post(`${API_BASE}/_test/promote-staff`, {
    headers: authHeaders(a.accessToken),
  })
  await page.evaluate(() => window.localStorage.clear())
  await page.context().clearCookies()
  await page.goto(APP_BASE + '/login')
  await page.locator('#email').fill(a.email)
  await page.locator('#password').fill(a.password)
  await page
    .getByRole('button', { name: /sign\s*in|log\s*in/i })
    .first()
    .click()
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 })

  await page.goto(APP_BASE + `/reports/${issueId}`)
  await expect(page.getByTestId('report-staff-panel')).toBeVisible({ timeout: 15_000 })
  // submitted → acknowledged, with the official response note.
  await page.getByTestId('report-staff-status').selectOption('acknowledged')
  await page.getByTestId('report-staff-note').fill('Crew inspected; patch scheduled this week.')
  await page.getByTestId('report-staff-apply').click()
  await expect(page.getByTestId('report-official-note')).toContainText(
    'Crew inspected; patch scheduled this week.',
    { timeout: 15_000 },
  )
  // acknowledged → in_review → resolved (the full ladder, each an event).
  await page.getByTestId('report-staff-status').selectOption('in_review')
  await page.getByTestId('report-staff-apply').click()
  await expect(page.getByTestId('status-badge')).toHaveAttribute('data-status', 'in_review', {
    timeout: 15_000,
  })
  await page.getByTestId('report-staff-status').selectOption('resolved')
  await page.getByTestId('report-staff-apply').click()
  await expect(page.getByTestId('status-badge')).toHaveAttribute('data-status', 'resolved', {
    timeout: 15_000,
  })
  const timeline = page.getByTestId('report-timeline-item')
  // submitted + acknowledged + in_review + resolved status events + 1 note.
  await expect(timeline).toHaveCount(5, { timeout: 15_000 })

  // --- A (still signed in, not the owner) confirms B's report. ---
  await page.getByTestId('report-confirm').click()
  await expect(page.getByTestId('report-confirmed')).toBeVisible({ timeout: 15_000 })

  // --- The watcher got notified about B's report in the first place. ---
  await page.goto(APP_BASE + '/notifications')
  const watchRow = page
    .locator('[data-mol-id="notification-item"][data-kind="watch_area_issue"]')
    .first()
  await expect(watchRow).toBeVisible({ timeout: 15_000 })
  await expect(watchRow).toContainText('pothole')

  // --- B sees the confirmation + status changes in their feed. ---
  await page.evaluate(() => window.localStorage.clear())
  await page.context().clearCookies()
  await page.goto(APP_BASE + '/login')
  await page.locator('#email').fill(b.email)
  await page.locator('#password').fill(b.password)
  await page
    .getByRole('button', { name: /sign\s*in|log\s*in/i })
    .first()
    .click()
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 })
  await page.goto(APP_BASE + '/notifications')
  await expect(
    page.locator('[data-mol-id="notification-item"][data-kind="confirmation"]').first(),
  ).toBeVisible({ timeout: 15_000 })
  await expect(
    page.locator('[data-mol-id="notification-item"][data-kind="status_change"]').first(),
  ).toBeVisible({ timeout: 15_000 })
})
