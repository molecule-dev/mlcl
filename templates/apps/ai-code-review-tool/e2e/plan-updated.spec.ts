import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('Plan updated confirmation page (/plan-updated)', () => {
  test('AuthGuard redirects anonymous visitors to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('renders the "plan updated" heading once authenticated', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    // Two h2 headings — message + thank-you. Both must be non-empty real text,
    // not raw i18n keys (which would mean translation never loaded).
    const headings = page.locator('h2')
    await expect(headings.first()).toBeVisible()
    const firstText = (await headings.first().textContent()) || ''
    expect(firstText.length, 'planUpdated.message must resolve to translated copy').toBeGreaterThan(
      2,
    )
    expect(firstText, 'i18n key must NOT leak as visible text').not.toMatch(/^planUpdated\./)
  })

  test('renders the thank-you heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const headings = page.locator('h2')
    await expect(headings.nth(1)).toBeVisible()
    const text = (await headings.nth(1).textContent()) || ''
    expect(text.length).toBeGreaterThan(2)
    expect(text).not.toMatch(/^planUpdated\./)
  })

  test('Return home button is rendered', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    // Scope to the return-home action specifically — the footer also
    // renders text buttons (Privacy / Terms / Language), so an unscoped
    // getByRole('button') is a strict-mode multi-match.
    await expect(page.getByRole('button', { name: /return/i })).toBeVisible()
  })

  test('Return home actually navigates to /', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const link = page.locator('a[href="/"]').first()
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(new RegExp(`${APP_BASE.replace(/[/.]/g, '\\$&')}/?$`))
  })

  test('initial load does NOT 5xx on any auth probe (captureNetwork)', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    const apiCalls = reqs.filter((r) => /\/api\//.test(r.url))
    for (const r of apiCalls) {
      expect(r.status, `${r.method} ${r.url} should not 5xx`).toBeLessThan(500)
    }
  })
})
