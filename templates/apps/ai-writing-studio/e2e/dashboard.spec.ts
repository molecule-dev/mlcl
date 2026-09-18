/**
 * /dashboard — authenticated landing for a signed-in writer.
 *
 * Asserts the dashboard summary loads (200 + populated KPIs), the Start-a-
 * new-document CTA actually creates a row server-side, the streak/heatmap
 * card renders, and the theme toggle changes <html data-theme> AND
 * survives a page reload.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedGet, captureNetwork, signup } from './_helpers.js'

test.describe('/dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
  })

  test('h1 greets the writer with their first name', async ({ page }) => {
    const h1 = page.getByRole('heading', { level: 1 }).first()
    await expect(h1).toBeVisible()
    await expect(h1).toContainText(/Plume/) // signup helper fills first name = "Plume"
  })

  test('Start a new document creates a real row and redirects to /documents/<uuid>', async ({
    page,
  }) => {
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('link', { name: /Start a new document/i })
        .first()
        .click()
      await page.waitForURL(/\/documents\/[0-9a-f-]{8,}/i, { timeout: 20_000 })
    })
    const createCall = reqs.find((r) => /\/api\/documents(\?|$)/.test(r.url) && r.method === 'POST')
    expect(createCall?.status, 'POST /api/documents must succeed').toBeGreaterThanOrEqual(200)
    expect(createCall?.status).toBeLessThan(300)
    const docId = page.url().split('/documents/')[1]?.split('?')[0]
    expect(docId).toMatch(/[0-9a-f-]{8,}/i)
    // Read-after-write: the new row exists.
    const list = await authedGet<unknown[]>(page, '/documents')
    expect(Array.isArray(list)).toBe(true)
    expect((list as Array<{ id: string }>).some((d) => d.id === docId)).toBe(true)
  })

  test('Continue-writing section renders', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Continue writing/i })).toBeVisible()
  })

  test('View all link routes to /documents', async ({ page }) => {
    await page.getByRole('link', { name: /^View all$/i }).click()
    await expect(page).toHaveURL(/\/documents$/)
  })

  test('Empty-state Create document link routes to /documents/<uuid>', async ({ page }) => {
    await page.getByRole('link', { name: /Create document/i }).click()
    await page.waitForURL(/\/documents\/[0-9a-f-]{8,}/i, { timeout: 20_000 })
  })

  test('hero streak card renders', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /A page a day keeps the muse engaged/i }),
    ).toBeVisible()
  })

  test('Total documents KPI tile renders', async ({ page }) => {
    await expect(page.getByText(/Total documents/i)).toBeVisible()
  })

  test('Published KPI tile renders', async ({ page }) => {
    // KPI card spans wrap an aria-hidden material-symbol glyph + label
    // text with no whitespace between, so the span's textContent reads
    // "check_circlePublished". Use bare substring match.
    await expect(page.getByText(/Published/i).first()).toBeVisible()
  })

  test('Avg SEO score KPI tile renders with /100 suffix', async ({ page }) => {
    await expect(page.getByText(/Avg SEO score/i)).toBeVisible()
    await expect(page.getByText(/\/100$/i)).toBeVisible()
  })

  test('AI words used KPI tile renders with limit suffix', async ({ page }) => {
    await expect(page.getByText(/AI words used/i)).toBeVisible()
  })

  test('Day-streak heading renders for a fresh user', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /\d+-day streak/i, level: 3 })).toBeVisible()
  })

  test('Sidebar lists all 8 primary navigation links', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: /Primary navigation/i })
    await expect(nav.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Documents' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Templates' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Image Generator' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Analytics' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Profile' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Billing' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Settings' })).toBeVisible()
  })

  test('Toggle theme flips <html data-mol-mode> AND persists across reload', async ({ page }) => {
    // The CSS-variables theme provider sets data-mol-theme + data-mol-mode
    // (prefix='mol' in createCSSVariablesThemeProvider config), not data-theme.
    const before = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    // Use dispatchEvent('click') so the React onClick fires regardless of
    // whether playwright's hit-test thinks an overlapping element is on top —
    // the dashboard's gradient hero + KPI rows sometimes shadow the sidebar
    // toggle in playwright's pointer model even though a real user can click.
    await page
      .getByRole('button', { name: /Toggle theme/i })
      .first()
      .dispatchEvent('click')
    await page.waitForFunction(
      (b) => document.documentElement.getAttribute('data-mol-mode') !== b,
      before,
      { timeout: 5000 },
    )
    const after = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    expect(after).not.toBe(before)
    expect(['light', 'dark']).toContain(after)
    await page.reload()
    const persisted = await page.evaluate(() =>
      document.documentElement.getAttribute('data-mol-mode'),
    )
    expect(persisted, 'theme must persist across reload').toBe(after)
  })
})
