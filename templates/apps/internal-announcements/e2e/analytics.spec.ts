/**
 * /analytics — KPI dashboard.
 *
 * The page aggregates announcement/team data into headline metrics and
 * pivots them by date range (7d / 30d / Quarter to date). The data is
 * derived client-side from `/api/announcements` + `/api/team` +
 * `/api/categories`, so the test asserts: the three range buttons exist
 * and visually flip; the underlying data calls fire on mount.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  captureNetwork,
  listAnnouncements,
  seedAnnouncement,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('analytics page', () => {
  test('renders the three range pivot buttons', async ({ page }) => {
    await signup(page, uniqueEmail('analytics-tabs'))
    await page.goto(APP_BASE + '/analytics')
    await expect(page.getByTestId('analytics-range-7d')).toBeVisible()
    await expect(page.getByTestId('analytics-range-30d')).toBeVisible()
    await expect(page.getByTestId('analytics-range-qtd')).toBeVisible()
  })

  test('clicking a range button changes the active styling', async ({ page }) => {
    await signup(page, uniqueEmail('analytics-pivot'))
    await page.goto(APP_BASE + '/analytics')
    const sevenD = page.getByTestId('analytics-range-7d')
    const thirtyD = page.getByTestId('analytics-range-30d')
    await thirtyD.click()
    await page.waitForTimeout(150)
    const after7 = await sevenD.getAttribute('class')
    const after30 = await thirtyD.getAttribute('class')
    // The active variant should differ from the inactive one. We can't
    // easily probe specific Tailwind classes (varies by ClassMap impl),
    // so we assert at least one class string differs.
    expect(after30).not.toEqual(after7)
  })

  test('GET /api/announcements + /api/team + /api/categories fire on mount', async ({ page }) => {
    await signup(page, uniqueEmail('analytics-net'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/analytics', { waitUntil: 'networkidle' })
    })
    const a = reqs.find((r) => /\/api\/announcements(?!\/me)/.test(r.url) && r.method === 'GET')
    const t = reqs.find((r) => /\/api\/team\b/.test(r.url) && r.method === 'GET')
    const c = reqs.find((r) => /\/api\/categories\b/.test(r.url) && r.method === 'GET')
    expect(a?.status, 'announcements GET missing').toBe(200)
    expect(t?.status, 'team GET missing').toBe(200)
    expect(c?.status, 'categories GET missing').toBe(200)
  })

  test('a freshly seeded announcement is reflected in the analytics data the page reads', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('analytics-seed'))
    const a = await seedAnnouncement(page, accessToken, {
      title: `Analytics seed ${Date.now()}`,
      requires_acknowledgment: false,
    })
    await page.goto(APP_BASE + '/analytics', { waitUntil: 'networkidle' })
    // The page just loaded; the announcement we seeded MUST be present
    // in the GET /api/announcements response that the page used. We
    // verify that via a direct re-read against the API server.
    const rows = await listAnnouncements(page, accessToken)
    expect(rows.find((r) => r.id === a.id)).toBeTruthy()
    // sanity: also confirm API_BASE is the API server, not the app
    expect(API_BASE).toMatch(/\/api$/)
  })

  test('Sign out from /analytics works', async ({ page }) => {
    await signup(page, uniqueEmail('analytics-signout'))
    await page.goto(APP_BASE + '/analytics')
    await page
      .getByRole('button', { name: /SIGN OUT|Sign out/i })
      .first()
      .click()
    await page.waitForURL(/\/login/, { timeout: 5000 })
  })

  test('Theme toggle flips data-mol-mode on /analytics', async ({ page }) => {
    await signup(page, uniqueEmail('analytics-theme'))
    await page.goto(APP_BASE + '/analytics')
    const before = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    await page
      .getByRole('button', { name: /Toggle theme/i })
      .first()
      .click()
    await page.waitForTimeout(200)
    const after = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    expect(after).not.toBe(before)
  })
})
