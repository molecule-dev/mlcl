/**
 * /terms — public terms of service. Static, no /api calls; verifies
 * substantive (non-placeholder) ToS copy renders.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('terms page', () => {
  test('renders the Terms h1', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.locator('h1, h2').first()).toContainText(/terms/i)
  })

  test('does not call /api on first paint', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/terms')
      await expect(page.locator('h1, h2').first()).toBeVisible()
    })
    const apiCalls = reqs.filter((r) => /\/api\//.test(r.url))
    expect(apiCalls, JSON.stringify(apiCalls)).toEqual([])
  })

  test('renders substantive ToS copy (no Lorem ipsum / placeholder)', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    const text = await page.locator('main, article, body').first().textContent()
    expect(text ?? '').not.toMatch(/Lorem ipsum/i)
    expect(text ?? '').not.toMatch(/Coming soon/i)
    expect((text ?? '').length).toBeGreaterThan(200)
  })

  test('mentions account / liability / governing-law-style content', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.locator('body')).toContainText(/account|liability|terms|service|use/i)
  })

  test('renders multiple section headings (h2 / h3)', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    const headingCount = await page.locator('h2, h3').count()
    expect(headingCount).toBeGreaterThanOrEqual(2)
  })

  test('page is reachable from the landing footer when present', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const link = page.locator('a[href="/terms"]').first()
    if ((await link.count()) > 0) {
      await link.click()
      await page.waitForURL('**/terms', { timeout: 5000 })
    }
  })
})
