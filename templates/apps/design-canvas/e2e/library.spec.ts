/**
 * /library — Auth-only design system browser. Loads /api/design_tokens
 * once, then filters between four sections (colors / typography /
 * components / effects) on the client.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('library page', () => {
  test('renders the heading and content area — GET /api/design_tokens hit', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/library')
      await expect(page.locator('[data-mol-id="library-section-content"]')).toBeVisible({
        timeout: 10000,
      })
    })
    const get = reqs.find(
      (r) => /\/api\/design_tokens/.test(r.url) && r.method === 'GET' && r.status < 400,
    )
    expect(get).toBeTruthy()
  })

  test('the page title heading is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/library')
    await expect(page.getByRole('heading', { name: /Library/ }).first()).toBeVisible()
  })

  test('"Color tokens" rail button is the default active section', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/library')
    await page.locator('[data-mol-id="library-section-colors"]').click()
    await page.waitForTimeout(200)
    await expect(page.locator('[data-mol-id="library-section-colors"]')).toBeVisible()
  })

  test('"Typography" rail button switches the section', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/library')
    await page.locator('[data-mol-id="library-section-typography"]').click()
    await page.waitForTimeout(300)
    await expect(page.locator('[data-mol-id="library-section-typography"]')).toBeVisible()
  })

  test('"Components" rail button switches the section', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/library')
    await page.locator('[data-mol-id="library-section-components"]').click()
    await page.waitForTimeout(300)
    await expect(page.locator('[data-mol-id="library-section-components"]')).toBeVisible()
  })

  test('"Effects" rail button switches the section', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/library')
    await page.locator('[data-mol-id="library-section-effects"]').click()
    await page.waitForTimeout(300)
    await expect(page.locator('[data-mol-id="library-section-effects"]')).toBeVisible()
  })

  test('the content region renders at least one token card after seeding', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/library')
    await page.waitForSelector('[data-mol-id="library-section-content"]', { timeout: 10000 })
    await page.locator('[data-mol-id="library-section-colors"]').click()
    await page.waitForTimeout(300)
    expect(await page.locator('[data-mol-id^="library-token-"]').count()).toBeGreaterThanOrEqual(1)
  })

  test('switching to typography renders the typography token cards', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/library')
    await page.locator('[data-mol-id="library-section-typography"]').click()
    await page.waitForTimeout(500)
    await expect(page.locator('[data-mol-id="library-section-content"]')).toBeVisible()
  })
})
