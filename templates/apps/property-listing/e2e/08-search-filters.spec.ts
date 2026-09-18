import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, apiContext, unwrapList } from './_helpers.js'

test.describe('Search filters', () => {
  test('Filtering /api/properties by min_price returns the expected subset', async () => {
    const ctx = await apiContext()
    // Fetch the full set so we know what to expect.
    const all = unwrapList<{ id: string; price?: number | string }>(
      await (await ctx.get(`${API_BASE}/properties?limit=200`)).json(),
    )
    expect(all.length).toBeGreaterThan(0)

    const prices = all.map((p) => Number(p.price ?? 0)).filter((n) => n > 0)
    expect(prices.length).toBeGreaterThan(0)
    // Use a min_price set above the cheapest property so the result MUST shrink.
    const sorted = [...prices].sort((a, b) => a - b)
    const cheapest = sorted[0]
    if (sorted.length < 2 || sorted[sorted.length - 1] === cheapest) {
      // Only one price point — can't run this contraction. Skip gracefully.
      test.skip(true, 'not enough price diversity to test filter contraction')
    }
    const minPrice = cheapest + 1

    const filtered = unwrapList<{ id: string; price?: number | string }>(
      await (await ctx.get(`${API_BASE}/properties?limit=200&min_price=${minPrice}`)).json(),
    )
    expect(filtered.length, `min_price=${minPrice} should drop at least one row`).toBeLessThan(
      all.length,
    )
    for (const p of filtered) {
      expect(
        Number(p.price),
        `every result must satisfy min_price=${minPrice}`,
      ).toBeGreaterThanOrEqual(minPrice)
    }
  })

  test('Filtering by property_type narrows the result set when the type exists', async () => {
    const ctx = await apiContext()
    const all = unwrapList<{ id: string; property_type?: string }>(
      await (await ctx.get(`${API_BASE}/properties?limit=200`)).json(),
    )
    const types = new Map<string, number>()
    for (const p of all) {
      if (p.property_type) types.set(p.property_type, (types.get(p.property_type) ?? 0) + 1)
    }
    if (types.size < 2) {
      test.skip(true, 'need at least two property_type values to test filter narrowing')
    }
    const [pickedType, pickedCount] = [...types.entries()].sort((a, b) => a[1] - b[1])[0]
    const filtered = unwrapList<{ id: string; property_type?: string }>(
      await (await ctx.get(`${API_BASE}/properties?limit=200&type=${pickedType}`)).json(),
    )
    expect(filtered.length).toBe(pickedCount)
    for (const p of filtered) {
      expect(p.property_type).toBe(pickedType)
    }
  })
})
