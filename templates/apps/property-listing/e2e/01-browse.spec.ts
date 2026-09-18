import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, apiContext, unwrapList } from './_helpers.js'

test.describe('Public property browse', () => {
  test('SearchPage renders seeded properties from /api/properties', async ({ page }) => {
    const ctx = await apiContext()
    const apiResp = await ctx.get(`${API_BASE}/properties?limit=40`)
    expect(apiResp.ok(), `GET /api/properties => ${apiResp.status()}`).toBe(true)
    const apiBody = await apiResp.json()
    const apiProperties = unwrapList<{ id: string; title?: string; address?: string }>(apiBody)
    expect(apiProperties.length, 'seed should populate at least one property').toBeGreaterThan(0)

    await page.goto('/')
    // Wait until the count badge or one of the property addresses appears
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    // At least one of the seeded property addresses must be visible
    const sampleAddress = apiProperties.find((p) => p.address)?.address ?? ''
    expect(sampleAddress.length, 'seed property should have an address').toBeGreaterThan(0)
    expect(body, 'expected seeded property address to be rendered').toContain(
      sampleAddress.split(',')[0].trim(),
    )
  })

  test('Property detail page hydrates from /api/properties/:id', async ({ page }) => {
    const ctx = await apiContext()
    const listResp = await ctx.get(`${API_BASE}/properties?limit=1`)
    const list = unwrapList<{ id: string; title?: string; address?: string; price?: number }>(
      await listResp.json(),
    )
    expect(list.length).toBeGreaterThan(0)
    const sample = list[0]

    await page.goto(`/property/${sample.id}`)
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    if (sample.address) {
      expect(body).toContain(sample.address.split(',')[0].trim())
    }
    if (sample.price && Number(sample.price) > 0) {
      // Price should appear formatted somewhere on the page
      const priceStr = Number(sample.price).toLocaleString('en-US')
      expect(body, 'expected formatted price somewhere on detail page').toMatch(
        new RegExp(priceStr.replace(/,/g, '[,\\s]?')),
      )
    }
  })

  test('Mortgage calculator returns real numbers from /api/mortgage/calculate', async ({
    page,
  }) => {
    const ctx = await apiContext()
    const list = unwrapList<{ id: string; price?: number }>(
      await (await ctx.get(`${API_BASE}/properties?limit=1`)).json(),
    )
    expect(list.length).toBeGreaterThan(0)
    const propId = list[0].id

    // Hit the API directly to assert the contract
    const calc = await ctx.post(`${API_BASE}/mortgage/calculate`, {
      data: {
        home_price: Number(list[0].price ?? 500000),
        down_payment: 50000,
        interest_rate: 6.5,
        loan_term_years: 30,
      },
    })
    expect(calc.ok(), `POST /mortgage/calculate => ${calc.status()}`).toBe(true)
    const result = (await calc.json()) as {
      monthly_payment?: number
      data?: { monthly_payment?: number }
    }
    const monthly = result.monthly_payment ?? result.data?.monthly_payment
    expect(monthly, 'monthly payment should be a positive number').toBeGreaterThan(0)

    // Hit the rendered detail page; the mortgage panel should have
    // populated the monthly payment line at least once during the visit.
    await page.goto(`/property/${propId}`)
    await page.waitForLoadState('networkidle')
    // Allow the mortgage panel up to 5s to populate
    await page.waitForTimeout(2_000)
    const text = await page.locator('body').innerText()
    expect(/\$\s?[\d,]+/.test(text), 'expected currency-formatted figure on detail page').toBe(true)
  })
})
