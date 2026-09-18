import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/privacy: legal page', () => {
  test('renders without auth and shows the privacy heading', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.getByRole('heading', { name: /privacy/i }).first()).toBeVisible()
  })

  test('renders Emerald Ledger-specific intro copy (no boilerplate)', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.getByText(/Emerald Ledger collects only/i)).toBeVisible()
  })

  test('does not require an authenticated session', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.reload()
    await expect(page).toHaveURL(/\/privacy/)
    await expect(page.getByRole('heading', { name: /privacy/i }).first()).toBeVisible()
  })

  test('does not produce console errors when navigated', async ({ page }) => {
    const errs: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errs.push(msg.text())
    })
    await page.goto(APP_BASE + '/privacy')
    await page.waitForLoadState('networkidle')
    const fatal = errs.filter(
      (e) => !/favicon|net::ERR_|Failed to load resource|sourcemap/i.test(e),
    )
    expect(fatal).toEqual([])
  })
})
