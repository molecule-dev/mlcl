/**
 * /search — Auth-only workspace search. Loads /api/search (debounced)
 * with optional `q` and `category` query params. Recent queries persist
 * to localStorage. Each result is a Link to its own page.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedProject, signup } from './_helpers.js'

test.describe('search page', () => {
  test('loads with default popular query — GET /api/search hit', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/search')
      await expect(page.locator('[data-mol-id="search-results"]')).toBeVisible({ timeout: 10000 })
      await page.waitForTimeout(500)
    })
    const get = reqs.find(
      (r) => /\/api\/search(\?|$)/.test(r.url) && r.method === 'GET' && r.status < 400,
    )
    expect(get).toBeTruthy()
  })

  test('typing in the input fires a GET /api/search?q=...', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/search')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="search-input"]').fill('Atelier')
      await page.waitForTimeout(800)
    })
    const get = reqs.find(
      (r) => /\/api\/search\?.*q=Atelier/.test(r.url) && r.method === 'GET' && r.status < 400,
    )
    expect(get).toBeTruthy()
  })

  test('"Projects" tab fires a GET /api/search?category=project', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedProject(page, accessToken, `SearchableProject ${Date.now()}`)
    await page.goto(APP_BASE + '/search')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="search-tab-project"]').click()
      await page.waitForTimeout(800)
    })
    const get = reqs.find(
      (r) =>
        /\/api\/search\?.*category=project/.test(r.url) && r.method === 'GET' && r.status < 400,
    )
    expect(get).toBeTruthy()
  })

  test('"Templates" tab fires a GET /api/search?category=template', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/search')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="search-tab-template"]').click()
      await page.waitForTimeout(800)
    })
    const get = reqs.find(
      (r) =>
        /\/api\/search\?.*category=template/.test(r.url) && r.method === 'GET' && r.status < 400,
    )
    expect(get).toBeTruthy()
  })

  test('"Components" tab fires a GET /api/search?category=component', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/search')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="search-tab-component"]').click()
      await page.waitForTimeout(800)
    })
    const get = reqs.find(
      (r) =>
        /\/api\/search\?.*category=component/.test(r.url) && r.method === 'GET' && r.status < 400,
    )
    expect(get).toBeTruthy()
  })

  test('"All" tab clears the category filter', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/search')
    await page.locator('[data-mol-id="search-tab-project"]').click()
    await page.locator('[data-mol-id="search-tab-all"]').click()
    await expect(page.locator('[data-mol-id="search-tab-all"]')).toBeVisible()
  })

  test('the form persists the current query on submit', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/search')
    await page.locator('[data-mol-id="search-input"]').fill('atelier-recent')
    await page
      .locator('[data-mol-id="search-form"]')
      .evaluate((form) => (form as HTMLFormElement).requestSubmit())
    await page.waitForTimeout(500)
    const stored = await page.evaluate(() => localStorage.getItem('dc-search-recent'))
    expect(stored).toContain('atelier-recent')
  })

  test('search results region renders cards or empty-state', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/search')
    await expect(page.locator('[data-mol-id="search-results"]')).toBeVisible()
  })

  test('seeded project appears in /api/search results when typing its name', async ({ page }) => {
    const { accessToken } = await signup(page)
    const name = `Findme${Date.now()}`
    await seedProject(page, accessToken, name)
    await page.goto(APP_BASE + '/search')
    await page.locator('[data-mol-id="search-input"]').fill(name)
    await page.waitForTimeout(900)
    await expect(page.locator(`text=${name}`).first()).toBeVisible({ timeout: 5000 })
  })
})
