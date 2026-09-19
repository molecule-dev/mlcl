import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/pricing', () => {
  test('renders three tiers with upgrade CTAs', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h1').first()).toBeVisible()
    expect(await page.locator('a[href="/signup"]').count()).toBeGreaterThanOrEqual(3)
  })

  test('no console errors on pricing load', async ({ page }) => {
    const errs: string[] = []
    page.on('pageerror', (e) => errs.push(e.message))
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle')
    expect(errs).toEqual([])
  })
})
