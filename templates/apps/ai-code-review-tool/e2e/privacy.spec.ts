import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('Privacy page (/privacy)', () => {
  test('renders heading without auth', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.getByRole('heading', { name: /^Privacy$/ })).toBeVisible()
  })

  test('shows real data-scope paragraph', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.getByText(/Refract stores only the data needed/)).toBeVisible()
  })

  test('shows real retention paragraph', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(
      page.getByText(/Review history, custom rules, and webhook audit logs/),
    ).toBeVisible()
  })

  test('shows a real privacy-contact email (not "TBD" / "Lorem ipsum")', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.getByText(/privacy@example\.com/)).toBeVisible()
  })

  test('renders three real paragraphs (no placeholder filler)', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    const text = await page.locator('main').textContent()
    expect(text || '').not.toMatch(/lorem ipsum|TBD|placeholder|coming soon/i)
    const pCount = await page.locator('main p').count()
    expect(pCount, 'privacy must have ≥ 3 real paragraphs').toBeGreaterThanOrEqual(3)
  })

  test('privacy page makes ZERO /api/* requests on initial render', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/privacy')
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    })
    const apiCalls = reqs.filter((r) => /\/api\//.test(r.url))
    expect(apiCalls).toEqual([])
  })
})
