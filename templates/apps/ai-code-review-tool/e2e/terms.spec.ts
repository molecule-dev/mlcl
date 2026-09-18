import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('Terms of Service page (/terms)', () => {
  test('renders heading without auth', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.getByRole('heading', { name: /Terms of Service/ })).toBeVisible()
  })

  test('shows real responsibility-clause copy', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.getByText(/By using Refract you agree/)).toBeVisible()
  })

  test('shows real acceptable-use clause', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.getByText(/scan repositories you do not own/)).toBeVisible()
  })

  test('shows a real contact email (not "TBD" / "Lorem ipsum")', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.getByText(/legal@example\.com/)).toBeVisible()
  })

  test('renders three real paragraphs (no placeholder filler)', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    const text = await page.locator('main').textContent()
    expect(text || '').not.toMatch(/lorem ipsum|TBD|placeholder|coming soon/i)
    const pCount = await page.locator('main p').count()
    expect(pCount, 'terms must have ≥ 3 real paragraphs').toBeGreaterThanOrEqual(3)
  })

  test('terms page makes ZERO /api/* requests on initial render', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/terms')
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    })
    const apiCalls = reqs.filter((r) => /\/api\//.test(r.url))
    expect(apiCalls).toEqual([])
  })
})
