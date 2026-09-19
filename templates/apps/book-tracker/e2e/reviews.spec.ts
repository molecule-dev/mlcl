/**
 * Reviews: the feed lists written reviews; an empty user sees the CTA.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, seedBook, signup } from './_helpers.js'

test('empty reviews page shows the write-one CTA', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/reviews')
  await expect(page.getByText(/no reviews yet/i)).toBeVisible({ timeout: 10_000 })
})

test('a written review appears in the feed', async ({ page }) => {
  const { accessToken } = await signup(page)
  const book = await seedBook(page, accessToken, 'Feed Review Book', { shelf: 'read' })

  const review = await page.request.patch(`${API_BASE}/books/${book.id}/review`, {
    headers: apiHeaders(accessToken),
    data: { rating: 4, review: 'Short but resonant.' },
  })
  expect(review.status()).toBe(200)

  await page.goto(APP_BASE + '/reviews')
  await expect(page.getByText('Feed Review Book').first()).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('Short but resonant.').first()).toBeVisible()
})
