/**
 * Smoke checks on the public/marketing pages and authenticated landings.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('forum public pages', () => {
  for (const path of [
    '/',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/pricing',
  ]) {
    test(`renders ${path}`, async ({ page }) => {
      await page.goto(APP_BASE + path)
      await expect(page.locator('body')).toBeVisible()
    })
  }
})

test.describe('forum authenticated pages', () => {
  test('every primary tab renders without 404', async ({ page }) => {
    await signup(page)
    for (const path of ['/feed', '/categories', '/compose', '/notifications', '/settings']) {
      await page.goto(APP_BASE + path)
      await expect(page.locator('h1, [role="heading"]').first()).toBeVisible({ timeout: 10000 })
    }
  })
})
