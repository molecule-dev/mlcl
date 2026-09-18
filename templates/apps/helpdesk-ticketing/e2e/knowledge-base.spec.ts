import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  authHeaders,
  captureNetwork,
  promoteToAdmin,
  signup,
} from './_helpers.js'

test.describe('helpdesk-ticketing: /knowledge-base', () => {
  test('/knowledge-base renders the page heading without role=alert', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/knowledge-base')
      await page.waitForLoadState('networkidle')
    })
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('[role=alert]')).toHaveCount(0)
    expect(reqs.some((r) => r.url.includes('/api/articles'))).toBe(true)
  })

  test('legacy deep links /knowledge-base/category/:id fall back to /knowledge-base', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/knowledge-base/category/abc-123')
    await expect(page).toHaveURL(/\/knowledge-base$/, { timeout: 10_000 })
  })

  test('legacy deep links /knowledge-base/articles/:id fall back to /knowledge-base', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/knowledge-base/articles/abc-123')
    await expect(page).toHaveURL(/\/knowledge-base$/, { timeout: 10_000 })
  })

  test('a freshly-created article surfaces in the /knowledge-base view (read-after-write)', async ({
    page,
  }) => {
    const session = await signup(page)
    // KB article writes are operator-only (requireAdmin); become the operator.
    await promoteToAdmin(page, session.accessToken)
    const title = `KB walking-test ${Date.now()}`
    const create = await page.request.post(`${API_BASE}/articles`, {
      headers: authHeaders(session.accessToken),
      data: { title, body: 'Body content for KB read-after-write check', status: 'published' },
    })
    expect(create.status(), await create.text().catch(() => '')).toBeLessThan(400)
    await page.goto(APP_BASE + '/knowledge-base')
    await expect(page.locator('body')).toContainText(title, { timeout: 15_000 })
    await page.reload({ waitUntil: 'networkidle' })
    await expect(page.locator('body')).toContainText(title)
  })

  test('/knowledge-base/new submits via the form and the new article appears in /knowledge-base (read-after-write)', async ({
    page,
  }) => {
    await signup(page)
    // The /knowledge-base/new form POSTs /api/articles, an operator-only write
    // (requireAdmin) — become the operator before submitting.
    await promoteToAdmin(page)
    const title = `KB new-form ${Date.now()}`
    await page.goto(APP_BASE + '/knowledge-base/new')
    await page.locator('[data-mol-id=article-title]').fill(title)
    await page
      .locator('[data-mol-id=article-body]')
      .fill('Body content authored via the /knowledge-base/new form (e2e).')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id=kb-new-submit]').click()
      await expect(page).toHaveURL(/\/knowledge-base(\?|$)/, { timeout: 15_000 })
    })
    const post = reqs.find((r) => /\/api\/articles$/.test(r.url) && r.method === 'POST')
    expect(post?.status, 'POST /api/articles must succeed').toBeLessThan(400)
    await expect(page.locator('body')).toContainText(title, { timeout: 15_000 })
  })
})
