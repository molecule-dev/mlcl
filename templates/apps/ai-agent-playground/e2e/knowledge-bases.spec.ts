import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedApi, captureNetwork, signup, whereUrl } from './_helpers.js'

test.describe('Knowledge bases page', () => {
  test('redirects unauthenticated visitors', async ({ page }) => {
    await page.goto(APP_BASE + '/knowledge-bases')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('renders empty state, GET /api/knowledge-bases fires, and "New" button is visible', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/knowledge-bases')
      await expect(page.locator('[data-mol-id="page-knowledge-bases"]')).toBeVisible()
    })
    await expect(page.locator('[data-mol-id="kb-new"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="kb-empty"]')).toBeVisible()
    const gets = whereUrl(reqs, /\/api\/knowledge-bases(\?|$)/, 'GET')
    expect(gets.length, 'GET /api/knowledge-bases on load').toBeGreaterThanOrEqual(1)
  })

  test('seeded knowledge base renders as a card', async ({ page, request }) => {
    const session = await signup(page)
    await authedApi(request, session.accessToken!).post('/knowledge-bases', {
      name: 'Customer FAQ',
      description: 'Indexed support corpus',
      embedding_model: 'text-embedding-3-large',
      document_count: 7,
    })
    await page.goto(APP_BASE + '/knowledge-bases')
    await expect(page.locator('[data-mol-id="kb-card"]').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Customer FAQ')).toBeVisible()
  })
})
