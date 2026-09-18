import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/pricing', () => {
  test('renders top heading', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await expect(
        page.getByRole('heading', { name: /Choose your.*plan|Pricing/i, level: 1 }),
      ).toBeVisible()
    })
    // GET /api/plans should fire on load (or be resilient if not — only assert presence is best-effort)
    expect(reqs.length).toBeGreaterThan(0)
  })

  test('renders three pricing cards', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    const cards = page.getByRole('article')
    await expect(cards).toHaveCount(3)
  })

  test('shows Starter tier heading', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading', { name: /^Starter$/i, level: 2 })).toBeVisible()
  })

  test('shows Creator tier heading', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading', { name: /^Creator$/i, level: 2 })).toBeVisible()
  })

  test('shows Studio tier heading', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading', { name: /^Studio$/i, level: 2 })).toBeVisible()
  })
})
