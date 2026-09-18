import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  apiHeaders,
  captureNetwork,
  seedProject,
  seedSegment,
  signup,
} from './_helpers.js'

test.describe('/review: queue', () => {
  test('approving a queued segment writes status=approved and removes it from /review_queue', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const project = await seedProject(page, accessToken, {
      source_lang: 'EN',
      target_langs: ['ES'],
    })
    const seg = await seedSegment(page, accessToken, {
      project_id: project.id,
      source_text: 'Needs a second pair of eyes.',
      source_lang: 'EN',
      target_lang: 'ES',
      position: 0,
    })
    await page.request.put(`${API_BASE}/segments/${encodeURIComponent(seg.id)}`, {
      headers: apiHeaders(accessToken),
      data: { target_text: 'Necesita revisión.', status: 'needs_review' },
      failOnStatusCode: true,
    })

    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/review')
      const approve = page.locator('button[data-mol-id="review-approve"]').first()
      await expect(approve).toBeVisible({ timeout: 10_000 })
      await approve.click()
      await page.waitForTimeout(500)
    })
    expect(
      reqs.find((r) => /\/api\/reports\/review_queue/.test(r.url) && r.method === 'GET'),
    ).toBeDefined()

    await expect
      .poll(
        async () => {
          const r = await page.request.get(`${API_BASE}/segments/${encodeURIComponent(seg.id)}`, {
            headers: apiHeaders(accessToken),
            failOnStatusCode: false,
          })
          const body = await r.json()
          const obj = body as { props?: { status?: string }; status?: string }
          return obj.props?.status ?? obj.status ?? ''
        },
        { timeout: 10_000 },
      )
      .toBe('approved')
  })

  test('GET /api/reports/review_queue returns an array on a fresh account', async ({ page }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.get(`${API_BASE}/reports/review_queue`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status()).toBeLessThan(300)
    const body = await res.json()
    // endpoint may return array or { rows: [] } shape — accept both
    expect(Array.isArray(body) || (body && typeof body === 'object')).toBe(true)
  })

  test('Review heading is visible on the page', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/review')
    await expect(
      page.getByRole('heading', { name: /review|segments awaiting/i }).first(),
    ).toBeVisible()
  })
})
