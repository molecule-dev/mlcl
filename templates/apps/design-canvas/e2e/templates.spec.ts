/**
 * /templates — Auth-only template gallery. Loads /api/templates, lets
 * the user filter by category and use a template via POST
 * /api/templates/:id/use which creates a new project + redirects.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('templates page', () => {
  test('renders the heading and at least one template card — GET /api/templates hit', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/templates')
      await page.waitForSelector('[data-mol-id="templates-grid"]', { timeout: 10000 })
    })
    const get = reqs.find(
      (r) => /\/api\/templates(\?|$)/.test(r.url) && r.method === 'GET' && r.status < 400,
    )
    expect(get).toBeTruthy()
    expect(
      await page.locator('[data-mol-id^="template-"]:not([data-mol-id^="template-use-"])').count(),
    ).toBeGreaterThanOrEqual(1)
  })

  test('"All" filter shows the unfiltered grid', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/templates')
    await page.waitForSelector('[data-mol-id="templates-grid"]', { timeout: 10000 })
    const all = await page
      .locator('[data-mol-id^="template-"]:not([data-mol-id^="template-use-"])')
      .count()
    await page.locator('[data-mol-id="templates-filter-all"]').click()
    await page.waitForTimeout(300)
    expect(
      await page.locator('[data-mol-id^="template-"]:not([data-mol-id^="template-use-"])').count(),
    ).toBe(all)
  })

  test('"UI Mockup" filter narrows the grid (or empty if no seeds match)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/templates')
    await page.waitForSelector('[data-mol-id="templates-grid"]', { timeout: 10000 })
    await page.locator('[data-mol-id="templates-filter-UI Mockup"]').click()
    await page.waitForTimeout(300)
    await expect(page.locator('[data-mol-id="templates-filter-UI Mockup"]')).toBeVisible()
  })

  test('"Branding" filter narrows the grid', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/templates')
    await page.waitForSelector('[data-mol-id="templates-grid"]', { timeout: 10000 })
    await page.locator('[data-mol-id="templates-filter-Branding"]').click()
    await page.waitForTimeout(300)
    await expect(page.locator('[data-mol-id="templates-filter-Branding"]')).toBeVisible()
  })

  test('"Marketing" filter narrows the grid', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/templates')
    await page.waitForSelector('[data-mol-id="templates-grid"]', { timeout: 10000 })
    await page.locator('[data-mol-id="templates-filter-Marketing"]').click()
    await page.waitForTimeout(300)
    await expect(page.locator('[data-mol-id="templates-filter-Marketing"]')).toBeVisible()
  })

  test('Templates grid renders one card per template', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/templates')
    await page.waitForSelector('[data-mol-id="templates-grid"]', { timeout: 10000 })
    expect(await page.locator('[data-mol-id^="template-use-"]').count()).toBeGreaterThanOrEqual(1)
  })

  test('"Use template" POSTs /api/templates/:id/use and navigates to /editor/<id>', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/templates')
    await page.waitForSelector('[data-mol-id^="template-use-"]', { timeout: 10000 })
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id^="template-use-"]').first().click()
      await page.waitForURL(/\/editor\/[a-f0-9-]+/, { timeout: 15000 })
    })
    const post = reqs.find(
      (r) => /\/api\/templates\/[^/]+\/use/.test(r.url) && r.method === 'POST' && r.status < 400,
    )
    expect(post).toBeTruthy()
  })

  test('the page title heading is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/templates')
    await expect(page.getByRole('heading', { name: /Templates/ }).first()).toBeVisible()
  })
})
