import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers'

test.describe('/calendar', () => {
  test('renders Calendar heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/calendar')
    await expect(page.getByRole('heading', { level: 1, name: /^Calendar$/ })).toBeVisible()
  })

  test('previous-month button is clickable and refetches', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/calendar')
    await page.waitForResponse((r) => r.url().includes('/api/journal/calendar/'), {
      timeout: 15_000,
    })
    const reqs = await captureNetwork(page, async () => {
      const btn = page.getByRole('button', { name: /previous month/i })
      await expect(btn).toBeEnabled({ timeout: 10_000 })
      const respWait = page.waitForResponse((r) => r.url().includes('/api/journal/calendar/'), {
        timeout: 15_000,
      })
      await btn.click()
      await respWait
    })
    expect(
      reqs.find((r) => r.url.includes('/api/journal/calendar/')),
      'calendar refetch',
    ).toBeDefined()
  })

  test('next-month button is clickable and refetches', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/calendar')
    await page.waitForResponse((r) => r.url().includes('/api/journal/calendar/'), {
      timeout: 15_000,
    })
    const reqs = await captureNetwork(page, async () => {
      const btn = page.getByRole('button', { name: /next month/i })
      await expect(btn).toBeEnabled({ timeout: 10_000 })
      const respWait = page.waitForResponse((r) => r.url().includes('/api/journal/calendar/'), {
        timeout: 15_000,
      })
      await btn.click()
      await respWait
    })
    expect(
      reqs.find((r) => r.url.includes('/api/journal/calendar/')),
      'calendar refetch',
    ).toBeDefined()
  })

  test('fresh user shows "Tracked 0 of N days"', async ({ page }) => {
    await signup(page)
    // Arm waitForResponse BEFORE goto so the calendar fetch is captured
    // even if it returns before the listener would otherwise register.
    const calResp = page.waitForResponse((r) => r.url().includes('/api/journal/calendar/'), {
      timeout: 15_000,
    })
    await page.goto(APP_BASE + '/calendar')
    await calResp
    await expect(page.getByText(/Tracked 0 of \d+ days this month/i)).toBeVisible()
  })

  test('day cells are present (one per day of the month)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/calendar')
    await page.waitForResponse((r) => r.url().includes('/api/journal/calendar/'), {
      timeout: 10_000,
    })
    const cells = page.getByRole('button', { name: /Day \d+ —/ })
    const count = await cells.count()
    expect(count).toBeGreaterThanOrEqual(28)
    expect(count).toBeLessThanOrEqual(31)
  })

  test('month-distribution panel renders mood labels', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/calendar')
    await expect(
      page.getByRole('heading', { level: 3, name: /This month at a glance/i }),
    ).toBeVisible()
  })
})
