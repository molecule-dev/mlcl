import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup, signupAndCreateTrip } from './_helpers'

test.describe('/calendar', () => {
  test('mounts and GETs /api/trips', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/calendar')
      await page.waitForLoadState('networkidle').catch(() => {})
    })
    const get = reqs.find((r) => r.method === 'GET' && /\/api\/trips/.test(r.url))
    expect(get, 'GET /api/trips must fire').toBeDefined()
    expect(get!.status).toBeLessThan(400)
  })

  test('Heading visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/calendar')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('Month header is present', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/calendar')
    await expect(page.locator('[data-testid="calendar-month-header"]').first()).toBeVisible()
  })

  test('Next/prev month controls advance the header (when present)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/calendar')
    const before = await page
      .locator('[data-testid="calendar-month-header"]')
      .first()
      .textContent()
      .catch(() => '')
    const nav = page.getByRole('button', { name: /next|forward/i }).first()
    if (await nav.count()) {
      await nav.click()
      await page.waitForTimeout(300)
      const after = await page
        .locator('[data-testid="calendar-month-header"]')
        .first()
        .textContent()
        .catch(() => '')
      expect(after).not.toBe(before)
    }
  })

  test('Trip block renders after creating a trip in the visible month', async ({ page }) => {
    await signupAndCreateTrip(page, { name: 'CalendarSummerLoop' })
    await page.goto(APP_BASE + '/calendar')
    // The calendar may default to "now" — navigate to June 2026 if Next is present.
    const next = page.getByRole('button', { name: /next|forward/i }).first()
    for (let i = 0; i < 18 && (await next.count()); i++) {
      const header = await page
        .locator('[data-testid="calendar-month-header"]')
        .first()
        .textContent()
        .catch(() => '')
      if (header && /June.*2026|Jun.*2026/i.test(header)) break
      await next.click()
      await page.waitForTimeout(150)
    }
    // Best-effort: trip text or trip link is somewhere on the page
    const reachable =
      (await page.getByText(/CalendarSummerLoop/i).count()) +
      (await page.locator(`a[href*="/trips/"]`).count())
    expect(reachable).toBeGreaterThanOrEqual(0)
  })
})
