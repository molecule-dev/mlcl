/**
 * Dashboard: signup lands on /dashboard, the page calls the reports
 * endpoints, an empty user sees the empty state, and the "Add book" CTA
 * navigates to /books/new.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test('dashboard fetches reports on first load', async ({ page }) => {
  const reqs = await captureNetwork(page, async () => {
    await signup(page)
    await page.waitForLoadState('networkidle')
  })

  expect(reqs.find((r) => /\/api\/reports\/today/.test(r.url))?.status).toBe(200)
  expect(reqs.find((r) => /\/api\/reports\/overview/.test(r.url))?.status).toBe(200)
})

test('empty dashboard shows the nothing-in-progress state', async ({ page }) => {
  await signup(page)
  await page.waitForLoadState('networkidle')
  await expect(page.locator('h1').first()).toContainText(/today/i, { timeout: 10_000 })
  await expect(page.getByText(/nothing in progress/i)).toBeVisible({ timeout: 10_000 })
})

test('"Add book" CTA navigates to /books/new', async ({ page }) => {
  await signup(page)
  await page.waitForLoadState('networkidle')
  await page.locator('[data-mol-id="dashboard-add-book"]').click()
  await page.waitForURL(/\/books\/new/, { timeout: 10_000 })
  await expect(page).toHaveURL(/\/books\/new/)
})

test('dashboard reflects a seeded reading book with progress', async ({ page }) => {
  const { accessToken } = await signup(page)

  // Seed a book via the API, shelved as reading.
  const create = await page.request.post(`${API_BASE}/books`, {
    headers: apiHeaders(accessToken),
    data: { title: 'Dashboard Book', author: 'E2E', page_count: 100, shelf: 'reading' },
  })
  expect(create.status()).toBe(201)
  const book = (await create.json()) as { id: string }

  // Log progress halfway through the API.
  const progress = await page.request.post(`${API_BASE}/books/${book.id}/progress`, {
    headers: apiHeaders(accessToken),
    data: { current_page: 50 },
  })
  expect(progress.status()).toBe(200)

  // Reload dashboard — the book appears in Currently reading.
  await page.goto(APP_BASE + '/dashboard')
  await expect(page.getByText('Dashboard Book').first()).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('50%').first()).toBeVisible({ timeout: 10_000 })
})
