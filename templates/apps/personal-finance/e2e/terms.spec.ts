import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/terms: legal page', () => {
  test('renders without auth and shows the terms heading', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.getByRole('heading', { name: /terms/i }).first()).toBeVisible()
  })

  test('renders Emerald Ledger tier-specific intro copy', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.getByText(/These terms cover use of Emerald Ledger/i)).toBeVisible()
  })

  test('does not require an authenticated session', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.reload()
    await expect(page).toHaveURL(/\/terms/)
    await expect(page.getByRole('heading', { name: /terms/i }).first()).toBeVisible()
  })

  test('does not produce console errors when navigated', async ({ page }) => {
    const errs: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errs.push(msg.text())
    })
    await page.goto(APP_BASE + '/terms')
    await page.waitForLoadState('networkidle')
    const fatal = errs.filter(
      (e) => !/favicon|net::ERR_|Failed to load resource|sourcemap/i.test(e),
    )
    expect(fatal).toEqual([])
  })
})
