import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  apiHeaders,
  captureNetwork,
  seedClient,
  seedEntry,
  seedProject,
  signup,
} from './_helpers.js'

test.describe('/timesheet page', () => {
  test('timesheet root + h1 + nav buttons render', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/timesheet')
    await expect(page.locator('[data-test="timesheet-page"]')).toBeVisible()
    await expect(page.getByRole('heading', { name: /^timesheet$/i })).toBeVisible()
    await expect(page.locator('[data-test="timesheet-prev"]')).toBeVisible()
    await expect(page.locator('[data-test="timesheet-today"]')).toBeVisible()
    await expect(page.locator('[data-test="timesheet-next"]')).toBeVisible()
  })

  test('previous week button changes the visible week label', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/timesheet')
    await page.waitForLoadState('networkidle')
    const labelBefore = await page.locator('[data-test="timesheet-today"]').innerText()
    await page.locator('[data-test="timesheet-prev"]').click()
    await page.waitForTimeout(500)
    const labelAfter = await page.locator('[data-test="timesheet-today"]').innerText()
    expect(labelAfter).not.toBe(labelBefore)
  })

  test('next week button changes the visible week label', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/timesheet')
    await page.waitForLoadState('networkidle')
    const labelBefore = await page.locator('[data-test="timesheet-today"]').innerText()
    await page.locator('[data-test="timesheet-next"]').click()
    await page.waitForTimeout(500)
    const labelAfter = await page.locator('[data-test="timesheet-today"]').innerText()
    expect(labelAfter).not.toBe(labelBefore)
  })

  test('today button resets to current week', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/timesheet')
    await page.waitForLoadState('networkidle')
    const original = await page.locator('[data-test="timesheet-today"]').innerText()
    await page.locator('[data-test="timesheet-prev"]').click()
    await page.waitForTimeout(300)
    await page.locator('[data-test="timesheet-today"]').click()
    await page.waitForTimeout(500)
    const restored = await page.locator('[data-test="timesheet-today"]').innerText()
    expect(restored).toBe(original)
  })

  test('empty-state row visible for a fresh user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/timesheet')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-test="timesheet-empty"]')).toBeVisible()
  })

  test('seeded entry shows up in a project row + the daily-total row', async ({ page }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken, { name: 'Acme Co' })
    const project = await seedProject(page, auth.accessToken, {
      name: 'Quarterly Audit',
      client_id: client.id,
      hourly_rate_cents: 12000,
    })
    const startedAt = new Date()
    startedAt.setHours(9, 0, 0, 0)
    const endedAt = new Date(startedAt.getTime() + 3600_000)
    await seedEntry(page, auth.accessToken, {
      description: 'Timesheet seeded',
      project_id: project.id,
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      is_billable: true,
    })

    await page.goto(APP_BASE + '/timesheet')
    await page.waitForLoadState('networkidle')
    await expect(page.locator(`[data-test="timesheet-row-${project.id}"]`)).toBeVisible()
    await expect(page.locator('[data-test="timesheet-total"]')).toBeVisible()
  })

  test('timesheet h1 heading explicitly renders', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/timesheet')
    await expect(page.getByRole('heading', { name: /^timesheet$/i })).toBeVisible()
  })

  test('timesheet load fires GET /api/entries', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/timesheet')
      await page.waitForLoadState('networkidle')
    })
    expect(reqs.find((r) => r.method === 'GET' && /\/api\/entries/.test(r.url))).toBeTruthy()
  })
})
