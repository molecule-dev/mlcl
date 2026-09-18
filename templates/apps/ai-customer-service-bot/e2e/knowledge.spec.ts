import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiGet, apiPost, captureNetwork, signup } from './_helpers.js'

interface ArticleRow {
  id: string
  title: string
  status: string
}

test.describe('/knowledge', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
  })

  test('list page fires GET /api/knowledge on load', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/knowledge')
      await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    })
    const list = reqs.find((r) => /\/api\/knowledge(?:\?|$)/.test(r.url) && r.method === 'GET')
    expect(list, 'GET /api/knowledge should fire').toBeTruthy()
    expect(list!.status).toBeLessThan(300)
  })

  test('renders the knowledge-base page container', async ({ page }) => {
    await page.goto(APP_BASE + '/knowledge')
    await expect(page.locator('[data-mol-id="page-knowledge-base"]')).toBeVisible({
      timeout: 10_000,
    })
  })

  test('clicking + New article opens the inline create form', async ({ page }) => {
    await page.goto(APP_BASE + '/knowledge')
    await page.locator('[data-mol-id="knowledge-new"]').click()
    await expect(page.locator('[data-mol-id="knowledge-new-form"]')).toBeVisible()
  })

  test('inline title input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/knowledge')
    await page.locator('[data-mol-id="knowledge-new"]').click()
    const title = page.locator('[data-mol-id="knowledge-new-title"]')
    await title.fill('My Article')
    await expect(title).toHaveValue('My Article')
  })

  test('inline content textarea accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/knowledge')
    await page.locator('[data-mol-id="knowledge-new"]').click()
    const body = page.locator('[data-mol-id="knowledge-new-content"]')
    await body.fill('Body text')
    await expect(body).toHaveValue('Body text')
  })

  test('Cancel button hides the inline form', async ({ page }) => {
    await page.goto(APP_BASE + '/knowledge')
    await page.locator('[data-mol-id="knowledge-new"]').click()
    await expect(page.locator('[data-mol-id="knowledge-new-form"]')).toBeVisible()
    await page.locator('[data-mol-id="knowledge-new-cancel"]').click()
    await expect(page.locator('[data-mol-id="knowledge-new-form"]')).toHaveCount(0)
  })

  test('search input filters by title and updates URL', async ({ page }) => {
    const title = 'Searchable Title ' + Date.now()
    await apiPost(page, '/knowledge', { title, content: 'searchable content', status: 'published' })
    await page.goto(APP_BASE + '/knowledge')
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    await page.locator('[data-mol-id="knowledge-search-input"]').fill('Searchable')
    await expect(page).toHaveURL(/q=Searchable/)
  })

  test('All-category chip is clickable', async ({ page }) => {
    await page.goto(APP_BASE + '/knowledge')
    await page.locator('[data-mol-id="knowledge-category-all"]').click()
    await expect(page.locator('[data-mol-id="knowledge-category-all"]')).toBeVisible()
  })

  test('creating an article persists and shows in the list (read-after-write)', async ({
    page,
  }) => {
    const title = 'Returns Workflow ' + Date.now()
    await apiPost(page, '/knowledge', {
      title,
      content: 'Step 1: ask for the order number. Step 2: open a refund.',
      status: 'published',
    })
    const list = await apiGet<ArticleRow[]>(page, '/knowledge')
    expect(list.some((a) => a.title === title)).toBe(true)
    await page.goto(APP_BASE + '/knowledge')
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    await expect(page.getByText(title)).toBeVisible({ timeout: 15_000 })
  })

  test('clicking an article card navigates to /knowledge/:id', async ({ page }) => {
    const created = await apiPost<ArticleRow>(page, '/knowledge', {
      title: 'Click Me ' + Date.now(),
      content: 'Body',
      status: 'published',
    })
    await page.goto(APP_BASE + '/knowledge')
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    await page.locator(`[data-mol-id="knowledge-card-${created.id}"]`).click()
    await expect(page).toHaveURL(new RegExp(`/knowledge/${created.id}`))
  })
})
