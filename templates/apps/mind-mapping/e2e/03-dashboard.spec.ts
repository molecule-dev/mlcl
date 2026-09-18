import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiHeaders, seedMap, seedNode, signup, uniqueEmail } from './_helpers.js'

test.describe('Dashboard', () => {
  test('shows real maps + node counts after seed', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('dash'))
    const map = await seedMap(page, accessToken, 'Dashboard seed map')
    await seedNode(page, accessToken, map.id, 'root', 100, 100)
    await seedNode(page, accessToken, map.id, 'leaf', 200, 200)

    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByRole('heading', { level: 2, name: /Branch new ideas/i })).toBeVisible()
    await expect(page.locator('text=Total maps').first()).toBeVisible()
    // Stat values: total maps >= 1, nodes >= 2
    await expect(page.locator('text=Total maps').locator('..').locator('p').nth(1)).toHaveText(
      /^\d+$/,
    )
    const totals = await page
      .locator('text=Total maps')
      .locator('..')
      .locator('p')
      .nth(1)
      .innerText()
    expect(parseInt(totals, 10)).toBeGreaterThanOrEqual(1)
    const nodeStat = await page
      .locator('text=Nodes branched')
      .locator('..')
      .locator('p')
      .nth(1)
      .innerText()
    expect(parseInt(nodeStat, 10)).toBeGreaterThanOrEqual(2)
    // The seeded map should appear in "Recent maps".
    await expect(page.locator('text=Dashboard seed map').first()).toBeVisible()
  })

  test('empty state when no maps', async ({ page }) => {
    await signup(page, uniqueEmail('empty'))
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.locator('text=No maps yet')).toBeVisible()
  })
})
