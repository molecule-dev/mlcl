import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/pricing', () => {
  test('renders pricing page heading', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading', { name: /Choose your.*plan/i, level: 1 })).toBeVisible()
  })

  test('renders Free tier card', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading', { name: /^Free$/i, level: 2 })).toBeVisible()
  })

  test('renders Pro tier card', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading', { name: /^Pro$/i, level: 2 })).toBeVisible()
  })

  test('renders Team tier card', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading', { name: /^Team$/i, level: 2 })).toBeVisible()
  })

  test('Upgrade to Pro button visible', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('button', { name: /Upgrade to Pro/i })).toBeVisible()
  })

  test('Upgrade to Team button visible', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('button', { name: /Upgrade to Team/i })).toBeVisible()
  })

  test('page load fetches /api/billing/tiers', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    expect(reqs.some((r) => /\/api\/billing\/tiers/.test(r.url) && r.method === 'GET')).toBeTruthy()
  })

  test('signed-in upgrade click POSTs /api/billing/checkout', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/pricing')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Upgrade to Pro/i }).click()
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    })
    expect(
      reqs.some((r) => /\/api\/billing\/checkout/.test(r.url) && r.method === 'POST'),
    ).toBeTruthy()
  })
})
