/**
 * BookDetail: shelf controls, progress logging, and review writing all
 * round-trip through the API.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, seedBook, signup } from './_helpers.js'

test('detail page shows the book + my-shelf section', async ({ page }) => {
  const { accessToken } = await signup(page)
  const book = await seedBook(page, accessToken, 'Detail Target', { shelf: 'reading' })

  await page.goto(APP_BASE + `/books/${book.id}`)
  await expect(page.getByRole('heading', { name: 'Detail Target' })).toBeVisible({
    timeout: 10_000,
  })
  await expect(page.locator('[data-mol-id="book-shelf-section"]')).toBeVisible()
  await expect(page.locator('[data-mol-id="book-progress-section"]')).toBeVisible()
})

test('logging progress updates the progress display', async ({ page }) => {
  const { accessToken } = await signup(page)
  const book = await seedBook(page, accessToken, 'Progress Book', {
    shelf: 'reading',
    pageCount: 200,
  })

  await page.goto(APP_BASE + `/books/${book.id}`)
  await page.locator('[data-mol-id="book-progress-page"]').fill('80')
  await page.locator('[data-mol-id="book-progress-submit"]').click()
  await expect(page.getByText('40%').first()).toBeVisible({ timeout: 10_000 })

  // Read-after-write: the page count is durable.
  const detail = await page.request.get(`${API_BASE}/books/${book.id}`, {
    headers: apiHeaders(accessToken),
  })
  const row = (await detail.json()) as { my: { current_page: number } | null }
  expect(row.my?.current_page).toBe(80)
})

test('rating + review save and confirm', async ({ page }) => {
  const { accessToken } = await signup(page)
  const book = await seedBook(page, accessToken, 'Review Book', { shelf: 'read' })

  await page.goto(APP_BASE + `/books/${book.id}`)
  await page.locator('[data-mol-id="book-rate-4"]').click()
  await page
    .locator('[data-mol-id="book-review-text"]')
    .fill('A quietly excellent book with a perfect ending.')
  await page.locator('[data-mol-id="book-review-save"]').click()
  await expect(page.locator('[data-mol-id="book-review-saved"]')).toBeVisible({
    timeout: 10_000,
  })

  // The review lands in the reviews feed.
  const feed = await page.request.get(`${API_BASE}/reviews`, {
    headers: apiHeaders(accessToken),
  })
  const rows = (await feed.json()) as { title: string; rating: number | null }[]
  expect(rows.find((r) => r.title === 'Review Book')?.rating).toBe(4)
})

test('finishing via progress auto-marks the shelf read', async ({ page }) => {
  const { accessToken } = await signup(page)
  const book = await seedBook(page, accessToken, 'Auto Finish', {
    shelf: 'reading',
    pageCount: 100,
  })

  await page.goto(APP_BASE + `/books/${book.id}`)
  await page.locator('[data-mol-id="book-progress-page"]').fill('100')
  await page.locator('[data-mol-id="book-progress-submit"]').click()

  // The Reading shelf button is no longer the active one — Read is.
  await expect(
    page.locator('[data-mol-id="book-shelf-section"] button[aria-pressed="true"]'),
  ).toHaveText(/read/i, { timeout: 10_000 })
})
