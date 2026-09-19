/**
 * Books: the shelves page lists the user's books, shelf filters narrow
 * it, and search finds by title.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, seedBook, signup } from './_helpers.js'

test('empty books page shows the no-books CTA', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/books')
  await expect(page.getByText(/no books yet/i)).toBeVisible({ timeout: 10_000 })
})

test('books page lists seeded books and filters by shelf', async ({ page }) => {
  const { accessToken } = await signup(page)
  const a = await seedBook(page, accessToken, 'Shelved Want', { shelf: 'want_to_read' })
  const b = await seedBook(page, accessToken, 'Shelved Reading', { shelf: 'reading' })

  await page.goto(APP_BASE + '/books')
  await expect(page.getByText(a.title).first()).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(b.title).first()).toBeVisible()

  // Filter to the Reading shelf — only the reading book remains.
  await page.getByRole('button', { name: /^reading$/i }).click()
  await expect(page.getByText(b.title).first()).toBeVisible()
  await expect(page.getByText(a.title)).toHaveCount(0)
})

test('books search narrows by title', async ({ page }) => {
  const { accessToken } = await signup(page)
  const a = await seedBook(page, accessToken, 'Needle In Haystack')
  await seedBook(page, accessToken, 'Other Volume')

  await page.goto(APP_BASE + '/books')
  await expect(page.getByText(a.title).first()).toBeVisible({ timeout: 10_000 })
  await page.locator('[data-mol-id="books-search"]').fill('Needle In Haystack')
  await expect(page.getByText('Other Volume')).toHaveCount(0, { timeout: 10_000 })
  await expect(page.getByText(a.title).first()).toBeVisible()
})

test('"Add book" navigates to the entry form', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/books')
  await page.locator('[data-mol-id="books-add-new"]').click()
  await page.waitForURL(/\/books\/new/, { timeout: 10_000 })
  await expect(page).toHaveURL(/\/books\/new/)
})
