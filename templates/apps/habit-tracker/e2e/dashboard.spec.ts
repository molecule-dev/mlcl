/**
 * Dashboard: signup lands on /dashboard, the page calls /api/habits and
 * /api/reports/today + /overview, an empty user sees the empty state,
 * and the "New habit" CTA navigates to /habits/new.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test('dashboard fetches habits + reports on first load', async ({ page }) => {
  const reqs = await captureNetwork(page, async () => {
    await signup(page)
    await page.waitForLoadState('networkidle')
  })

  expect(reqs.find((r) => /\/api\/habits$/.test(r.url) && r.method === 'GET')?.status).toBe(200)
  expect(reqs.find((r) => /\/api\/reports\/today/.test(r.url))?.status).toBe(200)
  expect(reqs.find((r) => /\/api\/reports\/overview/.test(r.url))?.status).toBe(200)
})

test('empty dashboard shows the no-habits CTA', async ({ page }) => {
  await signup(page)
  await page.waitForLoadState('networkidle')
  await expect(page.locator('h1').first()).toContainText(/today/i, { timeout: 10_000 })
  await expect(page.getByText(/no habits yet/i)).toBeVisible({ timeout: 10_000 })
})

test('"New habit" CTA navigates to /habits/new', async ({ page }) => {
  await signup(page)
  await page.waitForLoadState('networkidle')
  await page
    .getByRole('link', { name: /new habit/i })
    .first()
    .click()
  await page.waitForURL(/\/habits\/new/, { timeout: 10_000 })
  await expect(page).toHaveURL(/\/habits\/new/)
})

test('dashboard reflects a seeded habit + check-in', async ({ page }) => {
  const { accessToken } = await signup(page)

  // Seed a habit via the API.
  const create = await page.request.post(`${API_BASE}/habits`, {
    headers: apiHeaders(accessToken),
    data: { name: 'Read 10 pages', emoji: '📖', category: 'learning', cadence: 'daily' },
  })
  expect(create.status()).toBe(201)
  const habit = (await create.json()) as { id: string }

  // Check in via the API.
  const checkIn = await page.request.post(`${API_BASE}/habits/${habit.id}/check-in`, {
    headers: apiHeaders(accessToken),
    data: {},
  })
  expect(checkIn.status()).toBe(201)

  // Reload dashboard — the habit should now be visible AND its row
  // marked as completed today.
  await page.goto(APP_BASE + '/dashboard')
  await expect(page.getByText('Read 10 pages').first()).toBeVisible({ timeout: 10_000 })

  // Read-after-write through the API: the check-in is durable.
  const list = await page.request.get(`${API_BASE}/habits`, { headers: apiHeaders(accessToken) })
  const habits = (await list.json()) as Array<{ id: string; completed_today: boolean }>
  expect(habits.find((h) => h.id === habit.id)?.completed_today).toBe(true)
})
