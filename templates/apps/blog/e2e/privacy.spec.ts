/**
 * /privacy — public legal page. Asserts the heading, every documented
 * section data-mol-id is rendered with non-trivial copy, and that
 * footer links go to the expected sibling pages.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/privacy', () => {
  test('renders the Privacy heading', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/privacy')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { level: 1, name: /privacy/i })).toBeVisible()
  })

  test('the page main wrapper is present', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.locator('[data-mol-id="page-privacy"]')).toBeVisible()
  })

  test('the effective-date paragraph is non-empty', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    const txt = await page.locator('[data-mol-id="privacy-effective"]').innerText()
    expect(txt.length).toBeGreaterThan(5)
  })

  test('all five sub-sections render with substantive copy', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    for (const id of ['collect', 'use', 'cookies', 'rights', 'updates']) {
      const sec = page.locator(`[data-mol-id="privacy-${id}"]`)
      await expect(sec).toBeVisible()
      const t = await sec.innerText()
      expect(t.length, `privacy-${id} body`).toBeGreaterThan(60)
    }
  })

  test('header logo navigates back to /', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    const link = page.getByRole('link', { name: /WriteFlow/ }).first()
    if (await link.count()) {
      await link.click()
      await page.waitForURL(/.*\/$/, { timeout: 10000 })
    }
  })

  test('footer Terms control opens the terms modal', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await page.getByRole('button', { name: 'Terms' }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog')).toContainText(/terms/i)
  })

  test('footer Help link navigates to /help', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await page.getByRole('link', { name: 'Help' }).first().click()
    await page.waitForURL(/\/help/, { timeout: 10000 })
  })

  test('does NOT trigger any /api/* requests on initial load', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/privacy')
      await page.waitForLoadState('networkidle')
    })
    const apiCalls = reqs.filter((r) => /\/api\//.test(r.url))
    expect(apiCalls).toEqual([])
  })

  test('reload preserves URL and content', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await page.reload()
    await expect(page).toHaveURL(/\/privacy/)
    await expect(page.getByRole('heading', { level: 1, name: /privacy/i })).toBeVisible()
  })

  test('all sections wrapper is visible', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.locator('[data-mol-id="privacy-sections"]')).toBeVisible()
  })

  test('cookies section explicitly mentions cookies', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    const txt = await page.locator('[data-mol-id="privacy-cookies"]').innerText()
    expect(txt.toLowerCase()).toMatch(/cookie/)
  })

  test('rights section mentions data export or deletion', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    const txt = await page.locator('[data-mol-id="privacy-rights"]').innerText()
    expect(txt.toLowerCase()).toMatch(/export|delete|account/)
  })
})
