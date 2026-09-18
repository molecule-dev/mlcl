import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('memory: add entry persists', () => {
  test('saves a new memory entry via the form', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/memory')
    await page.locator('button[data-mol-id="memory-add-toggle"]').first().click()
    const src = `Custom segment ${Date.now()}`
    const tgt = `Segmento personalizado ${Date.now()}`
    await page.locator('textarea[data-mol-id="memory-add-source"]').fill(src)
    await page.locator('textarea[data-mol-id="memory-add-target"]').fill(tgt)
    await page.locator('input[data-mol-id="memory-add-source-lang"]').fill('EN')
    await page.locator('input[data-mol-id="memory-add-target-lang"]').fill('ES')
    const reqs = await captureNetwork(page, async () => {
      // Register the response listener BEFORE the click so the in-flight
      // POST is captured even on slower runs / parallel test pollution.
      const waitPost = page.waitForResponse(
        (r) => /\/api\/memory/.test(r.url()) && r.request().method() === 'POST' && r.status() < 300,
        { timeout: 15_000 },
      )
      await page.locator('button[data-mol-id="memory-add-submit"]').click()
      await waitPost
    })
    expect(reqs.find((r) => r.method === 'POST' && /\/api\/memory/.test(r.url))).toBeDefined()

    await expect
      .poll(
        async () => {
          const res = await page.request.get(`${API_BASE}/memory`, {
            headers: apiHeaders(accessToken),
            failOnStatusCode: false,
          })
          const list = (await res.json()) as Array<Record<string, unknown>>
          return list.find((m) => m.source_text === src)?.target_text ?? null
        },
        { timeout: 10_000 },
      )
      .toBe(tgt)
  })

  test('GET /api/memory returns an array on a fresh account', async ({ page }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.get(`${API_BASE}/memory`, { headers: apiHeaders(accessToken) })
    expect(res.status()).toBeLessThan(300)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  test('Memory heading is visible on the page', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/memory')
    await expect(page.getByRole('heading', { name: /memory/i }).first()).toBeVisible()
  })
})
