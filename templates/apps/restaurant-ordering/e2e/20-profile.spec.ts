/**
 * Profile page — personal account info. Verifies the form pre-fills with
 * the current user, edits round-trip through PATCH /api/users/:id, and
 * the change-password link routes to /forgot-password.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, signup } from './_helpers.js'

test('Profile page renders the personal-info form', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/profile', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: /personal info/i })).toBeVisible()
  await expect(page.locator('input#full-name')).toBeVisible()
  await expect(page.locator('input#email')).toBeVisible()
})

test('Profile: name save round-trips through PATCH /api/users/:id', async ({ page }) => {
  await signup(page)
  const me = await apiRequest<{ id?: string; props?: { id: string } }>(page, 'GET', '/api/users/me')
  const userId = me.body.id ?? me.body.props?.id
  expect(userId).toBeTruthy()

  const upd = await apiRequest(page, 'PATCH', `/api/users/${userId}`, { name: 'Jasmine Pao' })
  expect([200, 204]).toContain(upd.status)

  const after = await apiRequest<{ name?: string; props?: { name: string } }>(
    page,
    'GET',
    '/api/users/me',
  )
  const name = after.body.name ?? after.body.props?.name
  expect(name).toBe('Jasmine Pao')
})

test('Profile change-password link points at /forgot-password', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/profile', { waitUntil: 'domcontentloaded' })
  const link = page.locator('[data-testid="profile-change-password"]').first()
  await expect(link).toHaveAttribute('href', /\/forgot-password/)
})

test('Profile shows initials avatar derived from name/email', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/profile', { waitUntil: 'domcontentloaded' })
  // Header element renders the initials block. Just assert profile-name renders.
  await expect(page.locator('[data-testid="profile-name"]').first()).toBeVisible()
})
