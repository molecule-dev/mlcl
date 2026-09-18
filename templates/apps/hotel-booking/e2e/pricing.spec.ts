import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/pricing', () => {
  test('page heading is visible', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(
      page.getByRole('heading', { name: /Choose your Auberge plan/i, level: 1 }),
    ).toBeVisible()
  })

  test('"Free" tier card heading is rendered', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading', { name: /^Free$/, level: 2 })).toBeVisible()
  })

  test('Free tier "Current plan" CTA is disabled (free is the default)', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    const btn = page.getByRole('button', { name: /Current plan/i })
    await expect(btn).toBeDisabled()
  })

  test('Pro tier "Upgrade" button kicks POST /api/billing/checkout (or surfaces an inline error)', async ({
    browser,
  }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await signup(page)
    await page.goto(APP_BASE + '/pricing')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Upgrade to Pro/i }).click()
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    })
    expect(
      reqs.some((r) => /\/api\/billing\/checkout/.test(r.url) && r.method === 'POST'),
      'POST /api/billing/checkout must be observed when clicking the Pro upgrade CTA',
    ).toBeTruthy()
    await ctx.close()
  })

  test('Team tier "Upgrade" button kicks POST /api/billing/checkout (or surfaces an inline error)', async ({
    browser,
  }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await signup(page)
    await page.goto(APP_BASE + '/pricing')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Upgrade to Team/i }).click()
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    })
    expect(
      reqs.some((r) => /\/api\/billing\/checkout/.test(r.url) && r.method === 'POST'),
      'POST /api/billing/checkout must be observed when clicking the Team upgrade CTA',
    ).toBeTruthy()
    await ctx.close()
  })
})
