/**
 * Settings — profile update + theme toggle persistence across reload.
 * The theme is stored in localStorage; we assert the toggle survives a
 * page reload (a real persistence invariant, not just a UI flip).
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, signup } from './_helpers.js'

test('Settings page renders the profile form', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings', { waitUntil: 'domcontentloaded' })
  await expect(
    page.getByRole('heading', { name: /settings|account|profile/i }).first(),
  ).toBeVisible({ timeout: 15000 })
})

test('Profile name update round-trips through PATCH /api/users/:id', async ({ page }) => {
  await signup(page)
  const me = await apiRequest<{ id?: string; props?: { id: string } }>(page, 'GET', '/api/users/me')
  expect(me.status).toBe(200)
  // /api/users/me wraps the user in `props` (per @molecule/api-resource-user);
  // also accept a flat shape for forward compatibility.
  const userId = me.body.id ?? me.body.props?.id
  expect(userId, 'GET /api/users/me must return a user id').toBeTruthy()

  const upd = await apiRequest(page, 'PATCH', `/api/users/${userId}`, { name: 'Mira Smith' })
  expect([200, 201, 204]).toContain(upd.status)

  const after = await apiRequest<{ name?: string; props?: { name: string } }>(
    page,
    'GET',
    '/api/users/me',
  )
  const name = after.body.name ?? after.body.props?.name
  expect(name).toBe('Mira Smith')
})

test('Theme toggle persists across reload', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings', { waitUntil: 'domcontentloaded' })

  const initial = await page.evaluate(() => ({
    mode: document.documentElement.getAttribute('data-mol-mode'),
    name: document.documentElement.getAttribute('data-mol-theme'),
    ls: localStorage.getItem('molecule-theme'),
  }))

  // The ThemeToggle lives in the sidebar (RestaurantOrderingLayout) — aria-label = "Toggle theme".
  const toggle = page.getByRole('button', { name: /toggle theme|theme|dark|light/i }).first()
  await expect(toggle, 'theme toggle button must exist on every authed page').toBeVisible({
    timeout: 5000,
  })
  await toggle.click()
  await page.waitForTimeout(300)

  const before = await page.evaluate(() => ({
    mode: document.documentElement.getAttribute('data-mol-mode'),
    name: document.documentElement.getAttribute('data-mol-theme'),
    ls: localStorage.getItem('molecule-theme'),
  }))

  // The toggle must actually change the theme — not just flip aria-pressed.
  expect(before.name, 'data-mol-theme must change after toggle').not.toBe(initial.name)
  expect(before.ls, 'theme name must persist to localStorage').toBe(before.name)

  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(500)

  const after = await page.evaluate(() => ({
    mode: document.documentElement.getAttribute('data-mol-mode'),
    name: document.documentElement.getAttribute('data-mol-theme'),
    ls: localStorage.getItem('molecule-theme'),
  }))

  expect(after.ls, 'localStorage must survive reload').toBe(before.ls)
  expect(after.name, 'theme must be re-applied on reload').toBe(before.name)
  expect(after.mode, 'mode must match the persisted theme').toBe(before.mode)
})
