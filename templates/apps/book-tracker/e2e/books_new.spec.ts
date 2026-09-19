/**
 * AddBook: the manual entry form creates a book and lands on its detail
 * page.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test('add-book form creates a book and routes to its detail page', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/books/new')

  const title = `Form Entry ${Date.now()}`
  await page.locator('[data-mol-id="add-book-title"]').fill(title)
  await page.locator('[data-mol-id="add-book-author"]').fill('Form Author')
  await page.locator('[data-mol-id="add-book-pages"]').fill('240')
  // Pick a genre + the Reading shelf.
  await page.getByRole('button', { name: /^sci-fi$/i }).click()
  await page.getByRole('button', { name: /^reading$/i }).click()
  await page.locator('[data-mol-id="add-book-submit"]').click()

  await page.waitForURL(/\/books\/(?!new)[\w-]+/, { timeout: 15_000 })
  await expect(page.locator('h1').first()).toContainText(title, { timeout: 10_000 })
  await expect(page.getByText(/120|240/).first()).toBeVisible()
})
