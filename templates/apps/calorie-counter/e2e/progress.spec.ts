import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, completeOnboarding, signup } from './_helpers.js'

test.describe('/progress (Progress)', () => {
  test('Period buttons refetch /api/nutrition/daily-averages with new range', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/progress')
    await page.waitForLoadState('networkidle', { timeout: 6_000 }).catch(() => {})
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /^Month$/i })
        .first()
        .click()
      await page.waitForTimeout(800)
    })
    const get = reqs.find(
      (r) => /\/api\/nutrition\/daily-averages.*start_date=/.test(r.url) && r.method === 'GET',
    )
    expect(get, 'GET /api/nutrition/daily-averages fired').toBeTruthy()
  })

  test('Avg daily kcal stat card is rendered', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/progress')
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    await expect(page.getByText(/avg daily kcal/i).first()).toBeVisible()
  })

  test('Day-streak stat card pulls /api/nutrition/streak', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/progress')
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    })
    const get = reqs.find((r) => /\/api\/nutrition\/streak/.test(r.url) && r.method === 'GET')
    expect(get, 'GET /api/nutrition/streak fired').toBeTruthy()
    await expect(page.getByText(/day streak/i).first()).toBeVisible()
  })

  test('Days at goal stat card renders fraction', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/progress')
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    await expect(page.getByText(/days at goal/i).first()).toBeVisible()
  })

  test('Calories-by-day chart shows either bars or empty state', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/progress')
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    const empty = await page.getByText(/log a meal to start your trend/i).count()
    const bars = await page.locator('[aria-label*="kcal"]').count()
    expect(empty + bars).toBeGreaterThan(0)
  })

  test('Macro split list shows three rows (Protein/Carbs/Fat)', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/progress')
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    const macroHeader = page.getByRole('heading', { name: /macro split/i })
    await expect(macroHeader).toBeVisible()
    // The macro split is a sibling div under the header; assert all three
    // rows render somewhere on the page (text values come from i18n).
    const rows = await page.evaluate(() => {
      const root = Array.from(document.querySelectorAll('h3')).find((h) =>
        /macro split/i.test(h.textContent || ''),
      )
      const block = root?.parentElement
      if (!block) return []
      return Array.from(block.querySelectorAll('span'))
        .map((s) => (s.textContent || '').trim())
        .filter(Boolean)
    })
    expect(rows.some((r) => /protein/i.test(r))).toBe(true)
    expect(rows.some((r) => /carbs/i.test(r))).toBe(true)
    expect(rows.some((r) => /^fat$/i.test(r))).toBe(true)
  })
})
