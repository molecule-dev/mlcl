/**
 * /privacy — public privacy policy. Static, no /api calls; verifies
 * substantive (non-placeholder) policy copy renders.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('privacy page', () => {
  test('renders the Privacy h1', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.locator('h1, h2').first()).toContainText(/privacy/i)
  })

  test('does not call /api on first paint', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/privacy')
      await expect(page.locator('h1, h2').first()).toBeVisible()
    })
    const apiCalls = reqs.filter((r) => /\/api\//.test(r.url))
    expect(apiCalls, JSON.stringify(apiCalls)).toEqual([])
  })

  test('renders substantive policy copy (no Lorem ipsum / placeholder)', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    const text = await page.locator('main, article, body').first().textContent()
    expect(text ?? '').not.toMatch(/Lorem ipsum/i)
    expect(text ?? '').not.toMatch(/Coming soon/i)
    expect((text ?? '').length).toBeGreaterThan(200)
  })

  test('mentions data collection / privacy commitments', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.locator('body')).toContainText(/data|information|collect|privacy/i)
  })

  test('renders multiple section headings (h2 / h3)', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    const headingCount = await page.locator('h2, h3').count()
    expect(headingCount).toBeGreaterThanOrEqual(2)
  })

  test('page is reachable from the landing footer when present', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const link = page.locator('a[href="/privacy"]').first()
    if ((await link.count()) > 0) {
      await link.click()
      await page.waitForURL('**/privacy', { timeout: 5000 })
    }
  })
})
