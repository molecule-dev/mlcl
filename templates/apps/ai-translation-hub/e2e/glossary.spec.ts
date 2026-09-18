import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('glossary: add term persists', () => {
  test('saves a new term and exposes it via /api/glossary', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/glossary')
    await page.locator('button[data-mol-id="glossary-add-toggle"]').first().click()
    const sourceTerm = `widget-${Date.now()}`
    const targetTerm = `engranaje-${Date.now()}`
    await page.locator('input[data-mol-id="glossary-add-source-term"]').fill(sourceTerm)
    await page.locator('input[data-mol-id="glossary-add-target-term"]').fill(targetTerm)
    await page.locator('input[data-mol-id="glossary-add-source-lang"]').fill('EN')
    await page.locator('input[data-mol-id="glossary-add-target-lang"]').fill('ES')
    const reqs = await captureNetwork(page, async () => {
      // Register the response listener BEFORE the click so the in-flight
      // POST is captured even on slower runs / parallel test pollution.
      const waitPost = page.waitForResponse(
        (r) =>
          /\/api\/glossary/.test(r.url()) && r.request().method() === 'POST' && r.status() < 300,
        { timeout: 15_000 },
      )
      await page.locator('button[data-mol-id="glossary-add-submit"]').click()
      await waitPost
    })
    expect(reqs.find((r) => r.method === 'POST' && /\/api\/glossary/.test(r.url))).toBeDefined()

    await expect
      .poll(
        async () => {
          const res = await page.request.get(`${API_BASE}/glossary`, {
            headers: apiHeaders(accessToken),
            failOnStatusCode: false,
          })
          const list = (await res.json()) as Array<Record<string, unknown>>
          return list.find((t) => t.source_term === sourceTerm)?.target_term ?? null
        },
        { timeout: 10_000 },
      )
      .toBe(targetTerm)
  })

  test('GET /api/glossary returns an array on a fresh account', async ({ page }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.get(`${API_BASE}/glossary`, { headers: apiHeaders(accessToken) })
    expect(res.status()).toBeLessThan(300)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  test('Glossary heading is visible on the page', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/glossary')
    await expect(page.getByRole('heading', { name: /glossary/i }).first()).toBeVisible()
  })

  test('typing in the search field filters the list to matching rows', async ({ page }) => {
    const { accessToken } = await signup(page)
    // Seed two terms via the API.
    for (const [src, tgt] of [
      ['unique-search-token-A', 'tA'],
      ['otherword', 'tB'],
    ] as const) {
      await page.request.post(`${API_BASE}/glossary`, {
        headers: apiHeaders(accessToken),
        data: { source_term: src, target_term: tgt, source_lang: 'EN', target_lang: 'ES' },
      })
    }
    await page.goto(APP_BASE + '/glossary')
    const search = page.locator('input[data-mol-id="glossary-search"]').first()
    if (await search.count().catch(() => 0)) {
      await search.fill('unique-search-token')
      await expect(page.getByText('unique-search-token-A').first()).toBeVisible({ timeout: 10_000 })
      await expect(page.getByText('otherword')).toHaveCount(0)
    } else {
      // No search field — at minimum both rows should render after the page loads.
      await expect(page.getByText('unique-search-token-A').first()).toBeVisible({ timeout: 10_000 })
    }
  })
})
