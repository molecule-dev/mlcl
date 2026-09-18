/**
 * / (Landing) — public marketing page.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('landing page', () => {
  test('renders the hero + product CTAs', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('a').first()).toBeVisible()
  })

  test('exposes a sign-up link (anchor pointing to /signup)', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.locator('a[href="/signup"]').first()).toBeVisible()
  })

  test('exposes a sign-in link (anchor pointing to /login)', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.locator('a[href="/login"]').first()).toBeVisible()
  })
})

test.describe('root — network', () => {
  test('page load issues no 5xx responses', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/')
      await page.waitForLoadState('networkidle')
    })
    expect(reqs.filter((r) => r.status >= 500)).toEqual([])
  })
})
