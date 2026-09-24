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

  test('"New Index" opens the shared PromptDialog and POSTs the entered name', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    const api = authedApi(request, session.accessToken!)
    await page.goto(APP_BASE + '/knowledge-bases')
    await expect(page.locator('[data-mol-id="kb-new"]')).toBeVisible()

    // New Index opens the shared PromptDialog (replaces window.prompt): the
    // input is pre-seeded with a suggested kb_ name, fill + confirm POSTs.
    await page.locator('[data-mol-id="kb-new"]').click()
    const nameInput = page.locator('[data-mol-id="kb-name-input"]')
    await expect(nameInput).toBeVisible()
    await expect(nameInput).toHaveValue(/^kb_/)
    await nameInput.fill('e2e_corpus_kb')
    await page.locator('[data-mol-id="kb-create-confirm"]').click()

    await expect(page.getByText('e2e_corpus_kb')).toBeVisible({ timeout: 10000 })
    const rows = (await (await api.get('/knowledge-bases')).json()) as Array<{ name: string }>
    expect(rows.some((row) => row.name === 'e2e_corpus_kb')).toBe(true)
  })
})
