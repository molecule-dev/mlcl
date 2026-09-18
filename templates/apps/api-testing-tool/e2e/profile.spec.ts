import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/profile', () => {
  test('renders the level-1 heading after auth bootstrap', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  })

  test('"Recent activity" section heading renders', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await expect(page.getByRole('heading', { name: /Recent activity/i })).toBeVisible()
  })

  test('empty-state copy renders for a fresh user with no history', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await expect(page.getByText(/No requests have been fired yet/i)).toBeVisible()
    await ctx.close()
  })

  test('all three MetricStatCard eyebrows render', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    for (const eyebrow of [/^Collections$/i, /Saved requests/i, /^Monitors$/i]) {
      await expect(page.getByText(eyebrow).first()).toBeVisible()
    }
  })

  test('hero bio copy renders', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await expect(page.getByText(/Your personal Pylon workspace/i)).toBeVisible()
  })

  test('all four bootstrap GETs fire on page load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/profile')
      await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {})
    })
    expect(reqs.some((r) => r.method === 'GET' && /\/api\/collections/.test(r.url))).toBeTruthy()
    expect(
      reqs.some((r) => r.method === 'GET' && /\/api\/requests(?:\?|$)/.test(r.url)),
    ).toBeTruthy()
    expect(reqs.some((r) => r.method === 'GET' && /\/api\/monitors/.test(r.url))).toBeTruthy()
    expect(
      reqs.some((r) => r.method === 'GET' && /\/api\/history\?limit=8/.test(r.url)),
    ).toBeTruthy()
  })
})
