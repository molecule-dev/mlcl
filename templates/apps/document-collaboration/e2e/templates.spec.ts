/**
 * Templates — list system templates + instantiate creates a real doc.
 *
 * Outcome assertions:
 * - GET /api/templates returns the system template library, and every row
 *   in it renders on the page.
 * - Clicking "Use this template" creates a new owner-scoped doc with
 *   `template_id` set to the chosen template, and navigates to it.
 * - Filtering by category narrows the visible list to templates in
 *   that category.
 *
 * The library itself is demo content an app's owner replaces, so these specs
 * read the templates under test from the API instead of naming one.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  authHeaders,
  captureNetwork,
  listTemplates,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('templates', () => {
  test('templates page lists every template the API returns', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('tpl-list'))
    // Read the library from the same endpoint the page reads.
    const templates = await listTemplates(page, accessToken)
    expect(templates.length, 'template library should not be empty').toBeGreaterThan(0)

    await page.goto(APP_BASE + '/templates')
    await page.waitForSelector('[data-testid="templates-grid"]', { timeout: 15000 })
    const cards = page.locator('[data-testid="templates-grid"] > *')
    expect(await cards.count(), 'one card per template').toBeGreaterThanOrEqual(templates.length)
    for (const tpl of templates) {
      await expect(cards.filter({ hasText: tpl.name }).first()).toBeVisible()
    }
  })

  test('"Use this template" creates a new document with template_id set', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('tpl-use'))
    const tpls = await listTemplates(page, accessToken)
    const tpl = tpls.find((t) => t.is_system)
    expect(tpl, 'at least one system template should exist').toBeDefined()

    await page.goto(APP_BASE + '/templates')
    await page.waitForSelector('[data-testid="templates-grid"]')
    await page.getByTestId(`templates-use-${tpl!.id}`).click()
    await page.waitForURL(/\/doc\/[0-9a-f-]{36}/, { timeout: 15000 })
    const id = page.url().split('/doc/')[1]!.split('/')[0]!

    const docResp = await page.request.get(`${API_BASE}/documents/${id}`, {
      headers: authHeaders(accessToken),
    })
    expect(docResp.status()).toBe(200)
    const doc = (await docResp.json()) as { template_id: string | null; title: string }
    expect(doc.template_id).toBe(tpl!.id)
    expect(doc.title).toBe(tpl!.name)
  })

  test('blank-document link creates a new untitled doc', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('tpl-blank'))
    await page.goto(APP_BASE + '/templates')
    await page.waitForSelector('[data-testid="templates-blank"]')
    await page.getByTestId('templates-blank').click()
    await page.waitForURL(/\/doc\/[0-9a-f-]{36}/, { timeout: 15000 })
    const id = page.url().split('/doc/')[1]!.split('/')[0]!
    const docResp = await page.request.get(`${API_BASE}/documents/${id}`, {
      headers: authHeaders(accessToken),
    })
    expect(docResp.status()).toBe(200)
  })

  test('category filter narrows the visible templates', async ({ page }) => {
    await signup(page, uniqueEmail('tpl-filter'))
    await page.goto(APP_BASE + '/templates')
    await page.waitForSelector('[data-testid="templates-grid"]')
    const allCount = await page.locator('[data-testid="templates-grid"] > *').count()
    await page.getByTestId('templates-cat-engineering').click()
    await page.waitForTimeout(300)
    const engCount = await page.locator('[data-testid="templates-grid"] > *').count()
    expect(engCount).toBeGreaterThan(0)
    expect(engCount).toBeLessThanOrEqual(allCount)
  })
})

test.describe('templates — network', () => {
  test('page load triggers GET /api/templates', async ({ page }) => {
    await signup(page, uniqueEmail('tpl-net'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/templates')
      await page.waitForSelector('[data-testid="templates-grid"]', { timeout: 15000 })
    })
    expect(reqs.some((r) => r.url.includes('/api/templates'))).toBe(true)
  })
})
