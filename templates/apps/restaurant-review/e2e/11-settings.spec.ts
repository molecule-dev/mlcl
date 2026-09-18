/**
 * Settings — editing the display name PATCHes /api/users/:id and the new
 * value persists across page reloads (so the API actually saved it).
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, captureNetwork, signup } from './_helpers.js'

test('Updating display name PATCHes the API and survives reload', async ({ page }) => {
  const { email } = await signup(page)
  await page.goto(APP_BASE + '/settings')
  await expect(page.locator('[data-testid="settings-name"]')).toBeVisible({ timeout: 8000 })

  const newName = 'Frodo Baggins'
  await page.locator('[data-testid="settings-name"]').fill(newName)
  await page.locator('[data-testid="settings-save"]').click()
  await expect(page.locator('[data-testid="settings-saved"]')).toBeVisible({ timeout: 8000 })

  // Verify on backend (current /me). The user resource wraps payload in `props`.
  const me = await apiRequest<{
    props?: { name?: string; email?: string }
    name?: string
    email?: string
  }>(page, 'GET', '/api/users/me')
  expect(me.status).toBe(200)
  const name_ = me.body.props?.name ?? me.body.name
  const email_ = me.body.props?.email ?? me.body.email
  expect(name_).toBe(newName)
  expect(email_).toBe(email)

  // Reload and confirm persistence.
  await page.reload()
  await expect(page.locator('[data-testid="settings-name"]')).toHaveValue(newName, {
    timeout: 8000,
  })
})

test('Settings mount fires GET /api/users/me and PATCH on save', async ({ page }) => {
  const { email } = await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/settings')
    await expect(page.locator('[data-testid="settings-name"]')).toBeVisible({ timeout: 8000 })
    await page.locator('[data-testid="settings-name"]').fill('Net Captured')
    await page.locator('[data-testid="settings-save"]').click()
    await expect(page.locator('[data-testid="settings-saved"]')).toBeVisible({ timeout: 8000 })
  })
  const meCall = reqs.find((r) => /\/api\/users\/me/.test(r.url) && r.method === 'GET')
  const patchCall = reqs.find((r) => /\/api\/users\/[^/]+$/.test(r.url) && r.method === 'PATCH')
  expect(meCall, 'GET /api/users/me must fire on mount').toBeTruthy()
  expect(patchCall, 'PATCH /api/users/:id must fire on save').toBeTruthy()
  expect(patchCall!.status).toBeLessThan(400)
  expect(email).toMatch(/@/)
})

test('Settings exposes bio + delete-account button', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await expect(page.locator('[data-testid="settings-bio"]')).toBeVisible({ timeout: 8000 })
  await expect(page.locator('[data-testid="settings-delete"]')).toBeVisible({ timeout: 8000 })
})

test('Settings email input is reachable and pre-filled', async ({ page }) => {
  const { email } = await signup(page)
  await page.goto(APP_BASE + '/settings')
  await expect(page.locator('[data-testid="settings-email"]')).toHaveValue(email, { timeout: 8000 })
})

test('Save button is reachable and enabled', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await expect(page.locator('[data-testid="settings-save"]')).toBeVisible()
  await expect(page.locator('[data-testid="settings-save"]')).toBeEnabled()
})

test('Settings name field starts populated for an authed user', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await expect(page.locator('[data-testid="settings-name"]')).toHaveValue(/.+/, { timeout: 8000 })
})
