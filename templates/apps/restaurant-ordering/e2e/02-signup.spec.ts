/**
 * Signup — UI flow creates a real DB user, lands on dashboard, JWT
 * lives in-memory + httpOnly cookie, and the resulting session can read
 * owner-scoped resources without re-auth.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { apiRequest, getAccessToken, signup } from './_helpers.js'

test('Signup form creates an account and redirects to /dashboard', async ({ page }) => {
  await signup(page)
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })
  await expect(
    page.getByRole('heading', { name: /Tonight on the floor|Service in progress/i }).first(),
  ).toBeVisible()
})

test('After signup the JWT in the auth cookie is well-formed', async ({ page }) => {
  await signup(page)
  const token = await getAccessToken(page)
  const segments = token ? token.split('.').length : 0
  expect(segments).toBeGreaterThanOrEqual(3)
})

test('Authed user can read their own owner-scoped notifications endpoint', async ({ page }) => {
  await signup(page)
  const notifs = await apiRequest<{ data: unknown[] }>(page, 'GET', '/api/notifications')
  expect(notifs.status, 'GET /notifications').toBe(200)
  expect(Array.isArray(notifs.body.data)).toBe(true)
})

test('Authed user can read empty owner-scoped lists', async ({ page }) => {
  await signup(page)
  const menu = await apiRequest<{ data: unknown[] }>(page, 'GET', '/api/menu')
  expect(menu.status).toBe(200)
  expect(Array.isArray(menu.body.data)).toBe(true)

  const tables = await apiRequest<{ data: unknown[] }>(page, 'GET', '/api/tables')
  expect(tables.status).toBe(200)

  const orders = await apiRequest<{ data: unknown[] }>(page, 'GET', '/api/orders')
  expect(orders.status).toBe(200)
})
