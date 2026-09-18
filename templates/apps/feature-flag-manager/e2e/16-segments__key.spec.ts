import { test, expect } from '@molecule/app-e2e-fixtures-default'
import {
  APP_BASE,
  apiFetch,
  captureNetwork,
  conditionsOf,
  listSegments,
  pickSegmentWithCondition,
  signup,
  waitForSeed,
} from './_helpers'

// /segments/:key — segment detail. Tabs: rules, used_in, audit.
// Supports description edit, add/remove conditions via PUT
// /api/segments/:id with the full new conditions array.
//
// The segment each spec drives comes from GET /api/segments rather than a key
// the starter seed happens to create.

test.describe('/segments/:key', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto(APP_BASE + '/segments/any_segment_key')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('renders segment + GET /api/segments/:key + GET /api/audit-log fired', async ({ page }) => {
    await signup(page)
    await waitForSeed(page)
    const segment = (await listSegments(page))[0]
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/segments/' + segment.key)
      await page.waitForTimeout(2000)
    })
    const detail = reqs.find(
      (r) => r.method === 'GET' && new RegExp(`/api/segments/${segment.key}`).test(r.url),
    )
    expect(detail, 'GET /api/segments/:key should fire').toBeDefined()
    expect(detail!.status).toBe(200)
    const audit = reqs.find((r) => r.method === 'GET' && /\/api\/audit-log/.test(r.url))
    expect(audit, 'GET /api/audit-log should fire').toBeDefined()
  })

  test('rules tab is default and shows the segment’s own conditions', async ({ page }) => {
    await signup(page)
    await waitForSeed(page)
    // Both the segment and the attribute it targets come from the API.
    const segment = await pickSegmentWithCondition(page)
    const attribute = conditionsOf(segment)[0].attribute!
    await page.goto(APP_BASE + '/segments/' + segment.key)
    await page.waitForTimeout(1500)
    await expect(page.getByText(attribute).first()).toBeVisible()
  })

  test('switching to "used_in" tab renders without error', async ({ page }) => {
    await signup(page)
    await waitForSeed(page)
    const segment = (await listSegments(page))[0]
    await page.goto(APP_BASE + '/segments/' + segment.key)
    await page.waitForTimeout(1500)
    await page.locator('[data-mol-id="segment-detail-tab-used_in"]').click()
    // Should at minimum render the empty state or the flag list.
    const body = await page.locator('[data-mol-id="page-segment-detail"]').innerText()
    expect(body.toLowerCase()).toMatch(/no flags|on|off|production|staging|development/)
  })

  test('after editing a rule, audit tab shows a "targeting_changed" entry', async ({ page }) => {
    await signup(page)
    await waitForSeed(page)
    const segment = await pickSegmentWithCondition(page)
    // Hit /api/segments/:id/PUT to trigger a targeting_changed audit row.
    const put = await apiFetch(page, 'PUT', `/segments/${segment.id}`, {
      conditions: [...conditionsOf(segment), { attribute: 'plan', operator: 'in', value: ['pro'] }],
    })
    expect(put.status).toBe(200)
    await page.goto(APP_BASE + '/segments/' + segment.key)
    await page.waitForTimeout(1500)
    await page.locator('[data-mol-id="segment-detail-tab-audit"]').click()
    await page.waitForTimeout(500)
    const body = await page.locator('[data-mol-id="page-segment-detail"]').innerText()
    expect(body).toMatch(/targeting|updated/i)
  })

  test('adding a rule PUTs /api/segments/:id with the new conditions array', async ({ page }) => {
    await signup(page)
    await waitForSeed(page)
    const segment = await pickSegmentWithCondition(page)
    const before = conditionsOf(segment).length
    await page.goto(APP_BASE + '/segments/' + segment.key)
    await page.waitForTimeout(1500)
    await page.locator('[data-mol-id="segment-detail-toggle-add-rule"]').click()
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="segment-detail-save-rule"]').click()
      await page.waitForTimeout(2000)
    })
    const put = reqs.find((r) => r.method === 'PUT' && /\/api\/segments\/[0-9a-f-]+/.test(r.url))
    expect(put, 'PUT /api/segments/:id should fire').toBeDefined()
    expect(put!.status).toBe(200)
    // Read-after-write: one more condition than the segment started with.
    const detail = await apiFetch(page, 'GET', `/segments/${segment.key}`)
    const conds = conditionsOf(detail.json as { conditions?: unknown })
    expect(conds.length).toBe(before + 1)
  })

  test('description edit + Save persists across reload', async ({ page }) => {
    await signup(page)
    await waitForSeed(page)
    const segment = (await listSegments(page))[0]
    await page.goto(APP_BASE + '/segments/' + segment.key)
    await page.waitForTimeout(1500)
    const next = `edited ${Date.now()}`
    await page.locator('[data-mol-id="segment-detail-description"]').fill(next)
    await page.locator('[data-mol-id="segment-detail-save-description"]').click()
    await page.waitForTimeout(1500)
    await page.reload()
    await page.waitForTimeout(1500)
    await expect(page.locator('[data-mol-id="segment-detail-description"]')).toHaveValue(next)
  })

  test('Delete segment DELETEs and redirects to /segments', async ({ page }) => {
    await signup(page)
    await waitForSeed(page)
    // Pre-create a throwaway segment.
    const created = await apiFetch(page, 'POST', '/segments', {
      key: `tmp_${Date.now()}`,
      name: 'tmp',
      conditions: [],
    })
    const seg = created.json as { id: string; key: string }
    await page.goto(APP_BASE + `/segments/${seg.key}`)
    await page.waitForTimeout(1500)
    page.once('dialog', (d) => d.accept())
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="segment-detail-delete"]').click()
      await page.waitForTimeout(2000)
    })
    const del = reqs.find((r) => r.method === 'DELETE' && /\/api\/segments\/[0-9a-f-]+/.test(r.url))
    expect(del, 'DELETE /api/segments/:id should fire').toBeDefined()
    expect(del!.status).toBe(204)
    await expect(page).toHaveURL(/\/segments$/)
  })
})
