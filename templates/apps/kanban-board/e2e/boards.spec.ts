import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, API_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('boards page', () => {
  test('empty state heading "No boards yet" is visible for a fresh user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/boards')
    await expect(page.getByText(/No boards yet/i)).toBeVisible()
  })

  test('GET /api/boards fires on page load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/boards')
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    })
    const call = reqs.find((r) => /\/api\/boards(?:\?|$)/.test(r.url) && r.method === 'GET')
    expect(call, 'GET /api/boards should fire').toBeTruthy()
    expect(call!.status).toBe(200)
  })

  test('clicking "Create your first board" opens the create dialog', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/boards')
    await page.getByTestId('boards-empty-create').click()
    await expect(page.getByLabel(/Board name/i)).toBeVisible()
  })

  test('submitting the dialog POSTs /api/boards and navigates to /boards/:id', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/boards')
    await page.getByTestId('boards-empty-create').click()
    await page.getByLabel(/Board name/i).fill('Launch Plan')

    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Create board/i }).click()
      await page.waitForURL(/\/boards\/[0-9a-f-]{36}$/, { timeout: 15_000 })
    })
    await expect(page).toHaveURL(/\/boards\/[0-9a-f-]{36}$/)
    await expect(page.getByTestId('board-name')).toHaveText('Launch Plan')

    const post = reqs.find((r) => r.url.endsWith('/api/boards') && r.method === 'POST')
    expect(post, 'POST /api/boards should fire').toBeTruthy()
    expect(post!.status).toBe(201)

    // INVARIANT: persisted in DB and visible via the API.
    const res = await page.request.get(API_BASE + '/boards')
    const list = await res.json()
    expect(list).toHaveLength(1)
    expect(list[0].name).toBe('Launch Plan')
  })

  test('after creating boards via the API, the page lists them with working links', async ({
    page,
  }) => {
    await signup(page)
    await page.request.post(API_BASE + '/boards', { data: { name: 'Alpha Board' } })
    await page.request.post(API_BASE + '/boards', { data: { name: 'Beta Board' } })
    await page.goto(APP_BASE + '/boards')
    await expect(page.getByText('Alpha Board')).toBeVisible()
    await expect(page.getByText('Beta Board')).toBeVisible()
    await page.getByText('Alpha Board').first().click()
    await expect(page).toHaveURL(/\/boards\/[0-9a-f-]{36}$/, { timeout: 15_000 })
    await expect(page.getByTestId('board-name')).toHaveText('Alpha Board')
  })
})
