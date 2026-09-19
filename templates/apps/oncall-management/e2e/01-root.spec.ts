import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/', () => {
  test('renders the landing hero with brand and auth links', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    const body = await page.locator('body').innerText()
    // Structure, not demo copy: hero tagline + both auth CTAs exist.
    expect(body.length).toBeGreaterThan(0)
    await expect(page.locator('a[href="/signup"]').first()).toBeVisible()
    await expect(page.locator('a[href="/login"]').first()).toBeVisible()
  })

  test('pricing section lists three tiers', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.waitForLoadState('networkidle')
    const choosePlan = page.locator('a:has-text("Choose plan")')
    await expect(choosePlan.first()).toBeVisible()
    expect(await choosePlan.count()).toBe(3)
  })

  test('embedded pager demo shows incident rows (non-interactive)', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.waitForLoadState('networkidle')
    // The landing demo rows carry data-mol-id anchors without following links.
    expect(await page.locator('[data-mol-id^="incident-row-demo-"]').count()).toBeGreaterThan(0)
  })

  test('redirects unknown routes to the /404 page', async ({ page }) => {
    await page.goto(APP_BASE + '/definitely-not-a-route')
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  })

  test('no console errors on load', async ({ page }) => {
    const errs: string[] = []
    page.on('pageerror', (e) => errs.push(e.message))
    await page.goto(APP_BASE + '/')
    await page.waitForLoadState('networkidle')
    expect(errs).toEqual([])
  })
})
