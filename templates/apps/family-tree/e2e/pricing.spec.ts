/**
 * Pricing. Verifies the billing tiers endpoint returns the family-tree
 * limit set (maxPeople + advancedFeatures + canExport) and the public page
 * renders the tier names.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, listTiers } from './_helpers.js'

test.describe('pricing', () => {
  test('billing tiers expose the family-tree limits', async ({ page }) => {
    const tiers = await listTiers(page)
    expect(tiers.length).toBeGreaterThanOrEqual(3)
    const free = tiers.find((t) => t.key === 'free')
    const paid = tiers.find((t) => t.key !== 'free')
    expect(free).toBeDefined()
    expect(paid).toBeDefined()
    expect(free!.limits).toHaveProperty('maxPeople')
    expect(free!.limits).toHaveProperty('advancedFeatures')
    expect(free!.limits).toHaveProperty('canExport')
    const freeMax = Number(free!.limits.maxPeople)
    const paidMax = Number(paid!.limits.maxPeople)
    expect(paidMax).toBeGreaterThan(freeMax)
  })

  test('pricing page renders the tier names', async ({ page }) => {
    const tiers = await listTiers(page)
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle')
    for (const t of tiers) {
      await expect(page.getByText(t.name, { exact: true }).first()).toBeVisible()
    }
  })
})
