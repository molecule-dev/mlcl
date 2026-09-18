import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, expectNoConsoleErrors, signup } from './_helpers.js'

test.describe('dashboard page', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
  })

  test('renders the Hiring Overview heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /hiring overview|dashboard/i }).first(),
    ).toBeVisible()
  })

  test('fetches /api/reports/dashboard_stats and /api/notifications', async ({ page, browser }) => {
    const fresh = await browser.newContext()
    const p2 = await fresh.newPage()
    await signup(p2)
    const requests = await captureNetwork(p2, async () => {
      await p2.goto(APP_BASE + '/dashboard')
      await p2.waitForTimeout(2000)
    })
    expect(
      requests.some(
        (r) => r.method === 'GET' && /\/reports\/dashboard_stats\b/.test(r.url) && r.status === 200,
      ),
    ).toBeTruthy()
    expect(
      requests.some(
        (r) => r.method === 'GET' && /\/notifications\b/.test(r.url) && r.status === 200,
      ),
    ).toBeTruthy()
    await fresh.close()
  })

  test('Post-a-job link routes to /jobs/new', async ({ page }) => {
    await page
      .getByRole('link', { name: /post a job/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/jobs\/new$/)
  })

  test('View-all link in recent activity routes to /notifications', async ({ page }) => {
    const link = page.getByRole('link', { name: /view all/i }).first()
    if (await link.count()) {
      await link.click()
      await expect(page).toHaveURL(/\/notifications$/)
    }
  })

  test('All-candidates link routes to /candidates', async ({ page }) => {
    const link = page.getByRole('link', { name: /all candidates|view all candidates/i }).first()
    if (await link.count()) {
      await link.click()
      await expect(page).toHaveURL(/\/candidates$/)
    }
  })

  test('Pipeline funnel section is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /pipeline funnel/i }).first()).toBeVisible()
  })

  test('renders without console errors', async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await expect(page.getByRole('heading').first()).toBeVisible()
    })
  })
})
