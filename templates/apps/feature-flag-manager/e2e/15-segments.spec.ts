import { test, expect } from '@molecule/app-e2e-fixtures-default'
import {
  APP_BASE,
  apiFetch,
  captureNetwork,
  conditionsOf,
  listSegments,
  signup,
  waitForSeed,
} from './_helpers'

// /segments — segment CRUD. Create form opens via "New segment". The
// segments under test are read from GET /api/segments rather than named, so
// the suite holds once the starter workspace's segments are replaced.

test.describe('/segments', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto(APP_BASE + '/segments')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('GET /api/segments fires and every segment renders a card', async ({ page }) => {
    await signup(page)
    await waitForSeed(page)
    const segments = await listSegments(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/segments')
      await page.waitForTimeout(1500)
    })
    const get = reqs.find((r) => r.method === 'GET' && /\/api\/segments(\?|$)/.test(r.url))
    expect(get, 'GET /api/segments should fire').toBeDefined()
    expect(get!.status).toBe(200)
    await expect(page.locator('[data-mol-id^="segment-card-"]')).toHaveCount(segments.length)
    for (const segment of segments) {
      await expect(page.locator(`[data-mol-id="segment-card-${segment.key}"]`)).toBeVisible()
    }
  })

  test('"New segment" toggle opens the create form', async ({ page }) => {
    await signup(page)
    await waitForSeed(page)
    await page.goto(APP_BASE + '/segments')
    await page.locator('[data-mol-id="segments-new-btn"]').click()
    await expect(page.locator('[data-mol-id="segments-new-form"]')).toBeVisible()
  })

  test('Create segment POSTs /api/segments and the new card renders', async ({ page }) => {
    await signup(page)
    await waitForSeed(page)
    await page.goto(APP_BASE + '/segments')
    await page.locator('[data-mol-id="segments-new-btn"]').click()
    const key = `qa_${Date.now()}`
    await page.locator('[data-mol-id="segments-new-key"]').fill(key)
    await page.locator('[data-mol-id="segments-new-name"]').fill('QA cohort')
    await page.locator('[data-mol-id="segments-new-description"]').fill('Engineers in the QA team')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="segments-new-submit"]').click()
      await page.waitForTimeout(2000)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/segments(\?|$)/.test(r.url))
    expect(post, 'POST /api/segments should fire').toBeDefined()
    expect(post!.status).toBe(201)
    // Read-after-write
    const list = await apiFetch(page, 'GET', '/segments')
    const arr = list.json as Array<{ key: string; name: string }>
    expect(arr.find((s) => s.key === key && s.name === 'QA cohort')).toBeDefined()
    await expect(page.locator(`[data-mol-id="segment-card-${key}"]`)).toBeVisible()
  })

  test('Clicking a segment card deep-links to /segments/:key', async ({ page }) => {
    await signup(page)
    await waitForSeed(page)
    const segment = (await listSegments(page))[0]
    await page.goto(APP_BASE + '/segments')
    await page.waitForTimeout(1000)
    await page.locator(`[data-mol-id="segment-card-${segment.key}"]`).click()
    await expect(page).toHaveURL(new RegExp(`/segments/${segment.key}`))
  })

  test('Card shows the rule count from API conditions', async ({ page }) => {
    await signup(page)
    await waitForSeed(page)
    // Each card's count must match that segment's own conditions array.
    const segments = await listSegments(page)
    await page.goto(APP_BASE + '/segments')
    for (const segment of segments) {
      await expect(page.locator(`[data-mol-id="segment-card-${segment.key}"]`)).toContainText(
        String(conditionsOf(segment).length),
      )
    }
  })
})
