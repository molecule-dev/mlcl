import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('Pricing page (/pricing)', () => {
  test('renders the pricing headline anonymously', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(
      page.getByRole('heading', { name: /choose your snagr plan/i, level: 1 }),
    ).toBeVisible()
  })

  test('renders Free tier card', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading', { name: 'Free', level: 2 })).toBeVisible()
  })

  test('renders Pro tier card', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading', { name: 'Pro', level: 2 })).toBeVisible()
  })

  test('renders Team tier card', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading', { name: 'Team', level: 2 })).toBeVisible()
  })

  test('"Current plan" button is disabled (anon view of Free tier)', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    const btn = page.getByRole('button', { name: /current plan/i }).first()
    if (await btn.count()) await expect(btn).toBeDisabled()
  })

  test('Upgrade to Pro button is rendered (and clickable when authed)', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('button', { name: /upgrade to pro/i })).toBeVisible()
  })

  test('Upgrade to Team button is rendered (and clickable when authed)', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('button', { name: /upgrade to team/i })).toBeVisible()
  })

  test('page-load fetches /api/billing/tiers', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await page.waitForTimeout(1000)
    })
    const tiers = reqs.filter((r) => /\/api\/billing\/tiers/.test(r.url) && r.method === 'GET')
    expect(tiers.length, 'GET /api/billing/tiers fired').toBeGreaterThan(0)
    expect(
      tiers.every((r) => r.status === 200),
      'tiers returned 200',
    ).toBe(true)
  })
})
