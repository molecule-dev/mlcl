import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { gotoAndWait, APP_BASE, API_BASE, captureNetwork, getAccessToken, signup } from './_helpers'

// /traces/:id — trace waterfall + linked logs.

async function firstTraceId(page: import('@playwright/test').Page): Promise<string | null> {
  const token = await getAccessToken(page)
  const res = await page.request.get(API_BASE + '/traces', {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await res.json()
  const items: Array<{ id: string }> = Array.isArray(body) ? body : body.data || body.results || []
  return items[0]?.id ?? null
}

test.describe('/traces/:id', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto(APP_BASE + '/traces/anything')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('shows trace hero from GET /api/traces/:id', async ({ page }) => {
    await signup(page)
    const id = await firstTraceId(page)
    test.skip(!id, 'no traces seeded')
    const reqs = await captureNetwork(page, async () => {
      await gotoAndWait(page, APP_BASE + `/traces/${id}`, (r) =>
        new RegExp(`/api/traces/${id}`).test(r.url()),
      )
    })
    expect(
      reqs.find((r) => r.method === 'GET' && new RegExp(`/api/traces/${id}`).test(r.url)),
    ).toBeDefined()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('"All traces" back-link goes to /traces', async ({ page }) => {
    await signup(page)
    const id = await firstTraceId(page)
    test.skip(!id, 'no traces seeded')
    await page.goto(APP_BASE + `/traces/${id}`)
    await page
      .getByRole('link', { name: /all traces|back/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/traces$/)
  })

  test('renders the span waterfall with at least 1 span', async ({ page }) => {
    await signup(page)
    const id = await firstTraceId(page)
    test.skip(!id, 'no traces seeded')
    await gotoAndWait(page, APP_BASE + `/traces/${id}`, (r) =>
      new RegExp(`/api/traces/${id}`).test(r.url()),
    )
    const spans = page.locator('main ol li, main ul li')
    await expect(spans.first()).toBeVisible({ timeout: 5_000 })
  })
})
