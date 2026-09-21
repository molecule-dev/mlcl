import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, signup, waitForSeed } from './_helpers.js'

test.describe('dashboard', () => {
  test('KPI row and campaign progress render for a seeded account', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByRole('heading', { name: /^dashboard$/i, level: 1 })).toBeVisible({
      timeout: 15000,
    })
    await expect(page.getByText(/raised this year/i)).toBeVisible()
    // Scoped to main: the sidebar nav link is also named "Donors" — an
    // unscoped full-text match hits both and fails strict mode.
    await expect(page.getByRole('main').getByText(/^donors$/i)).toBeVisible()
    await expect(page.getByText(/average gift/i)).toBeVisible()
    await expect(page.getByText(/gifts this year/i)).toBeVisible()
    // Campaign progress bars + recent gifts list render from the same summary.
    await expect
      .poll(async () => page.getByRole('progressbar').count(), { timeout: 10000 })
      .toBeGreaterThanOrEqual(1)
    await expect(page.getByRole('heading', { name: /recent gifts/i, level: 2 })).toBeVisible()
  })

  test('YTD KPIs show non-zero seeded values (DATE-column year bucket)', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    // The seed writes many current-year gifts; a year filter that stringifies
    // a pg Date ("Tue Nov 18 2026…".slice(0,4) = "Tue ") zeroes every KPI.
    const summary = await page.request.get(new URL('/api/dashboard/summary', APP_BASE).toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(summary.status()).toBe(200)
    const body = (await summary.json()) as {
      raised_ytd_cents: number
      gifts_ytd: number
      avg_gift_cents: number
      year: number
    }
    expect(body.year).toBe(new Date().getFullYear())
    expect(body.gifts_ytd, 'seeded gifts this year').toBeGreaterThan(0)
    expect(body.raised_ytd_cents, 'seeded raised YTD in cents').toBeGreaterThan(0)
    expect(body.avg_gift_cents).toBe(Math.round(body.raised_ytd_cents / body.gifts_ytd))
  })

  test('record-gift CTA links to the gift form', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await page.goto(APP_BASE + '/dashboard')
    await page.getByRole('link', { name: /\+ record gift/i }).click()
    await expect(page).toHaveURL(/\/gifts\/new/, { timeout: 10000 })
  })
})
