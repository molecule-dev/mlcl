import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, captureNetwork, signup } from './_helpers.js'

test.describe('/workspace', () => {
  test('renders the page heading after auth bootstrap', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/workspace')
    await expect(page.getByRole('heading', { name: /^Workspace$/i, level: 1 })).toBeVisible()
  })

  test('HTTP method picker accepts a different value', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/workspace')
    const select = page.locator('[data-mol-id="workspace-method"]')
    await expect(select).toBeVisible()
    await select.selectOption('POST')
    await expect(select).toHaveValue('POST')
  })

  test('Request URL field accepts a URL value', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/workspace')
    const url = page.locator('[data-mol-id="workspace-url"]')
    await url.fill('https://httpbin.org/get')
    await expect(url).toHaveValue('https://httpbin.org/get')
  })

  test('"Save" persists a saved request via POST /api/requests', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/workspace')
    await page.locator('[data-mol-id="workspace-url"]').fill('https://httpbin.org/get')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="workspace-save"]').click()
      await page.locator('[data-mol-id="workspace-status-message"]').waitFor({ timeout: 10_000 })
    })
    const wrote = reqs.some(
      (r) =>
        r.method === 'POST' &&
        /\/api\/requests(?:\?|$)/.test(r.url) &&
        r.status >= 200 &&
        r.status < 300,
    )
    expect(wrote, 'POST /api/requests must succeed').toBeTruthy()

    // Read-after-write: the saved row is visible to the API
    const { status, body } = await apiRequest<unknown[]>(page, 'GET', '/api/requests')
    expect(status, 'GET /api/requests must succeed').toBe(200)
    expect(
      Array.isArray(body) ? body.length : 0,
      'workspace must have at least one saved request',
    ).toBeGreaterThan(0)
  })

  test('"Send" fires POST /api/requests/:id/execute and surfaces a real response', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/workspace')
    await page.locator('[data-mol-id="workspace-url"]').fill('https://httpbin.org/get')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="workspace-send"]').click()
      // Wait for the status message to appear, indicating the send completed
      await page.locator('[data-mol-id="workspace-status-message"]').waitFor({ timeout: 30_000 })
    })
    expect(
      reqs.some((r) => r.method === 'POST' && /\/api\/requests\/.+\/execute/.test(r.url)),
      'POST /api/requests/:id/execute must be observed',
    ).toBeTruthy()
    // Read-after-write: a history row should now exist
    const { status, body } = await apiRequest<unknown[]>(page, 'GET', '/api/history?limit=10')
    expect(status).toBe(200)
    expect(
      Array.isArray(body) ? body.length : 0,
      'history must have at least one row after send',
    ).toBeGreaterThan(0)
  })

  test('Params tab updates the URL hash to #params', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/workspace')
    await page.locator('[data-mol-id="workspace-tab-params"]').click()
    await expect(page).toHaveURL(/#params$/)
  })

  test('Auth tab updates the URL hash to #auth', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/workspace#params')
    await page.locator('[data-mol-id="workspace-tab-auth"]').click()
    await expect(page).toHaveURL(/#auth$/)
  })

  test('Headers tab updates the URL hash to #headers', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/workspace')
    await page.locator('[data-mol-id="workspace-tab-headers"]').click()
    await expect(page).toHaveURL(/#headers$/)
  })

  test('Body tab updates the URL hash to #body', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/workspace')
    await page.locator('[data-mol-id="workspace-tab-body"]').click()
    await expect(page).toHaveURL(/#body$/)
  })

  test('Tests tab updates the URL hash to #tests', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/workspace')
    await page.locator('[data-mol-id="workspace-tab-tests"]').click()
    await expect(page).toHaveURL(/#tests$/)
  })

  test('Auth-type combobox flips between options', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/workspace')
    const sel = page.getByLabel(/Auth type/i)
    await sel.selectOption('basic')
    await expect(sel).toHaveValue('basic')
  })

  test('Token input accepts a value', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/workspace')
    const tok = page.getByLabel(/Token/i)
    await tok.fill('sk-test-token')
    await expect(tok).toHaveValue('sk-test-token')
  })
})
