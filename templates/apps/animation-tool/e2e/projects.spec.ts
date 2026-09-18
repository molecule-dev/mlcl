import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/projects (Projects)', () => {
  test('renders the Projects heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/projects')
    await expect(page.getByRole('heading', { name: /Projects/i, level: 1 })).toBeVisible()
  })

  test('New project click POSTs /api/projects, creates a row, and navigates to /projects/:id', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/projects')

    // Snapshot the count before.
    const cookies = await page.context().cookies()
    const cookieStr = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
    const before = await page.request.get(`${API_BASE}/projects`, {
      headers: { Cookie: cookieStr },
    })
    const beforeArr = await before.json()
    const beforeCount = Array.isArray(beforeArr) ? beforeArr.length : 0

    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /New project/i })
        .first()
        .click()
      await page.waitForURL(/\/projects\/[0-9a-f-]{36}/, { timeout: 15_000 })
    })
    const post = reqs.find((r) => /\/api\/projects(?:\?|$)/.test(r.url) && r.method === 'POST')
    expect(post, 'POST /api/projects fired').toBeTruthy()
    expect(post!.status).toBeLessThan(300)
    expect(page.url(), 'navigated to editor').toMatch(/\/projects\/[0-9a-f-]{36}/)

    // Invariant: GET /api/projects after the create returns one more row.
    const after = await page.request.get(`${API_BASE}/projects`, { headers: { Cookie: cookieStr } })
    const afterArr = await after.json()
    expect(Array.isArray(afterArr)).toBe(true)
    expect(afterArr.length, 'project count must increase by 1').toBe(beforeCount + 1)
  })

  test('search input accepts text', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/projects')
    const inp = page.locator('input[type=search]')
    await inp.fill('fluid intro')
    await expect(inp).toHaveValue('fluid intro')
  })

  test('All filter pill is rendered', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/projects')
    await expect(page.getByRole('button', { name: /^All$/i })).toBeVisible()
  })

  test('Ready filter changes the data-mol-filter attribute', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/projects')
    await page.getByRole('button', { name: /^Ready$/i }).click()
    const before = await page.locator('[data-mol-filter]').first().getAttribute('data-mol-filter')
    expect(before).toBe('ready')
  })

  test('Rendering filter sets data-mol-filter=rendering', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/projects')
    await page.getByRole('button', { name: /^Rendering$/i }).click()
    const v = await page.locator('[data-mol-filter]').first().getAttribute('data-mol-filter')
    expect(v).toBe('rendering')
  })

  test('Draft filter sets data-mol-filter=draft', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/projects')
    await page.getByRole('button', { name: /^Draft$/i }).click()
    const v = await page.locator('[data-mol-filter]').first().getAttribute('data-mol-filter')
    expect(v).toBe('draft')
  })

  test('Shared filter sets data-mol-filter=shared', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/projects')
    await page.getByRole('button', { name: /^Shared$/i }).click()
    const v = await page.locator('[data-mol-filter]').first().getAttribute('data-mol-filter')
    expect(v).toBe('shared')
  })

  test('Errors filter sets data-mol-filter to "error"', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/projects')
    await page.getByRole('button', { name: /^Errors$/i }).click()
    const v = await page.locator('[data-mol-filter]').first().getAttribute('data-mol-filter')
    expect(v).toBe('error')
  })
})
