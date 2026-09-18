import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, whereUrl } from './_helpers.js'

test.describe('/repositories', () => {
  test('renders heading + at least one repo row', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/repositories')
    await expect(page.getByRole('heading', { name: /^Repositories$/i, level: 1 })).toBeVisible()
    const rows = page.locator('a[href^="/repositories/"]')
    await expect(rows.first()).toBeAttached()
  })

  test('GET /api/repositories fires on page load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/repositories')
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    })
    const get = whereUrl(reqs, /\/api\/repositories(?:\?|$)/, 'GET')
    expect(get.length, 'GET /api/repositories fired').toBeGreaterThan(0)
    expect(get[0].status).toBe(200)
  })

  test('each row shows a repo name', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/repositories')
    const rows = page.locator('a[href^="/repositories/"]')
    await expect(rows.first()).toBeVisible({ timeout: 15_000 })
    const texts = await rows.allTextContents()
    expect(texts.length, 'at least one repo row rendered').toBeGreaterThan(0)
    for (const [i, text] of texts.entries()) {
      expect(text.length, `row ${i} should not be empty`).toBeGreaterThan(0)
    }
  })

  test('each row shows a language and branch', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/repositories')
    const rows = page.locator('a[href^="/repositories/"]')
    // Wait for at least one row to render — page.goto resolves on DOM
    // load, before the /api/repositories fetch + render completes.
    await expect(rows.first()).toBeVisible({ timeout: 15_000 })
    // At least one row has a language · branch shape ("X · main" or similar)
    const allText = (await rows.allTextContents()).join('\n')
    expect(allText.includes('·'), 'at least one repo shows lang · branch').toBe(true)
  })

  test('clicking a repo row navigates to /repositories/:slug', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/repositories')
    const link = page.locator('a[href^="/repositories/"]').first()
    const href = await link.getAttribute('href')
    await link.click()
    await expect(page).toHaveURL(new RegExp(href!))
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
})
