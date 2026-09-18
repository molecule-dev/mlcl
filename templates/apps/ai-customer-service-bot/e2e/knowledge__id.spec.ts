/**
 * Knowledge article detail (/knowledge/:id) tests.
 *
 * The detail page is where operators read, edit, and delete knowledge
 * articles. Tests cover view mode, edit toggle, save → backend update,
 * delete confirm dialog and DELETE → 404 invariant.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiGet, apiPost, captureNetwork, signup } from './_helpers.js'

interface ArticleRow {
  id: string
  title: string
  content: string
  body_md: string
  status: string
}

async function seedArticle(page: any, suffix = '') {
  return apiPost<ArticleRow>(page, '/knowledge', {
    title: 'Detail Title ' + Date.now() + suffix,
    content: 'Detail body. Step 1: ask. Step 2: answer.',
    status: 'published',
    category: 'Onboarding',
  })
}

test.describe('/knowledge/:id', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
  })

  test('renders the knowledge-detail page container', async ({ page }) => {
    const a = await seedArticle(page)
    await page.goto(APP_BASE + '/knowledge/' + a.id)
    await expect(page.locator('[data-mol-id="page-knowledge-detail"]')).toBeVisible({
      timeout: 10_000,
    })
  })

  test('breadcrumb link returns to /knowledge', async ({ page }) => {
    const a = await seedArticle(page)
    await page.goto(APP_BASE + '/knowledge/' + a.id)
    await page.locator('[data-mol-id="knowledge-breadcrumb"]').click()
    await expect(page).toHaveURL(/\/knowledge(?:\?|$|\?|#)/)
  })

  test('renders the article title from /api/knowledge/:id', async ({ page }) => {
    const a = await seedArticle(page)
    await page.goto(APP_BASE + '/knowledge/' + a.id)
    await expect(page.locator('[data-mol-id="knowledge-detail-title-display"]')).toContainText(
      a.title,
      { timeout: 10_000 },
    )
  })

  test('renders the article body', async ({ page }) => {
    const a = await seedArticle(page)
    await page.goto(APP_BASE + '/knowledge/' + a.id)
    await expect(page.locator('[data-mol-id="knowledge-detail-body"]')).toContainText(
      'Step 1: ask',
      { timeout: 10_000 },
    )
  })

  test('Edit button toggles into edit mode', async ({ page }) => {
    const a = await seedArticle(page)
    await page.goto(APP_BASE + '/knowledge/' + a.id)
    await page.locator('[data-mol-id="knowledge-detail-edit"]').click()
    await expect(page.locator('[data-mol-id="knowledge-detail-edit-form"]')).toBeVisible()
  })

  test('title input in edit mode accepts text', async ({ page }) => {
    const a = await seedArticle(page)
    await page.goto(APP_BASE + '/knowledge/' + a.id)
    await page.locator('[data-mol-id="knowledge-detail-edit"]').click()
    const titleInput = page.locator('[data-mol-id="knowledge-detail-title"]')
    await titleInput.fill('Edited Title XYZ')
    await expect(titleInput).toHaveValue('Edited Title XYZ')
  })

  test('content textarea in edit mode accepts text', async ({ page }) => {
    const a = await seedArticle(page)
    await page.goto(APP_BASE + '/knowledge/' + a.id)
    await page.locator('[data-mol-id="knowledge-detail-edit"]').click()
    const contentInput = page.locator('[data-mol-id="knowledge-detail-content"]')
    await contentInput.fill('Edited body content.')
    await expect(contentInput).toHaveValue('Edited body content.')
  })

  test('Save in edit mode persists the new title to the backend', async ({ page }) => {
    const a = await seedArticle(page)
    await page.goto(APP_BASE + '/knowledge/' + a.id)
    await page.locator('[data-mol-id="knowledge-detail-edit"]').click()
    const newTitle = 'Persisted Edit ' + Date.now()
    await page.locator('[data-mol-id="knowledge-detail-title"]').fill(newTitle)
    await page.locator('[data-mol-id="knowledge-detail-save"]').click()
    let after: ArticleRow | undefined
    const deadline = Date.now() + 10_000
    while (Date.now() < deadline) {
      after = await apiGet<ArticleRow>(page, `/knowledge/${a.id}`)
      if (after.title === newTitle) break
      await new Promise((r) => setTimeout(r, 500))
    }
    expect(after?.title).toBe(newTitle)
  })

  test('Delete button opens the confirmation dialog', async ({ page }) => {
    const a = await seedArticle(page)
    await page.goto(APP_BASE + '/knowledge/' + a.id)
    await page.locator('[data-mol-id="knowledge-detail-delete"]').click()
    await expect(page.locator('[data-mol-id="knowledge-delete-confirm"]')).toBeVisible()
  })

  test('Cancel button in confirm dialog dismisses it', async ({ page }) => {
    const a = await seedArticle(page)
    await page.goto(APP_BASE + '/knowledge/' + a.id)
    await page.locator('[data-mol-id="knowledge-detail-delete"]').click()
    await page.locator('[data-mol-id="knowledge-delete-confirm-no"]').click()
    await expect(page.locator('[data-mol-id="knowledge-delete-confirm"]')).toHaveCount(0)
  })

  test('Confirm delete DELETEs and returns the user to /knowledge with a 404 on the row', async ({
    page,
  }) => {
    const a = await seedArticle(page, '-deletable')
    await page.goto(APP_BASE + '/knowledge/' + a.id)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="knowledge-detail-delete"]').click()
      await page.locator('[data-mol-id="knowledge-delete-confirm-yes"]').click()
      await page.waitForURL(/\/knowledge(?:\?|$)/, { timeout: 10_000 })
    })
    const del = reqs.find(
      (r) => new RegExp(`/api/knowledge/${a.id}`).test(r.url) && r.method === 'DELETE',
    )
    expect(del, 'DELETE /api/knowledge/:id should fire').toBeTruthy()
    expect(del!.status).toBeLessThan(300)
    const cookies = await page.context().cookies()
    const res = await page.request.get(
      'http://localhost:' + (process.env.API_PORT || '4000') + `/api/knowledge/${a.id}`,
      {
        headers: { Cookie: cookies.map((c) => `${c.name}=${c.value}`).join('; ') },
      },
    )
    expect(res.status(), 'GET on deleted article should be 404').toBe(404)
  })
})
