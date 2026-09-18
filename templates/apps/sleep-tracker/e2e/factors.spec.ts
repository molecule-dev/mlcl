/**
 * Sleep-factors API contract.
 *
 * - GET /factors/defaults returns the seeded factor library
 *   (caffeine, alcohol, screen-time, exercise, etc.)
 * - GET /factors/correlation returns correlation analysis (200 + shape)
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, apiHeaders, signup } from './_helpers.js'

test('GET /factors/defaults returns the seeded factor list', async ({ page }) => {
  const { accessToken } = await signup(page)
  const res = await page.request.get(`${API_BASE}/factors/defaults`, {
    headers: apiHeaders(accessToken),
  })
  expect(res.status()).toBe(200)
  const list = (await res.json()) as {
    id?: string
    name?: string
    slug?: string
    category?: string
  }[]
  expect(list.length).toBeGreaterThan(0)
})

test('GET /factors/correlation returns 200 for an empty user', async ({ page }) => {
  const { accessToken } = await signup(page)
  const res = await page.request.get(`${API_BASE}/factors/correlation`, {
    headers: apiHeaders(accessToken),
  })
  expect(res.status()).toBe(200)
})
