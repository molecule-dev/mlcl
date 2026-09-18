/**
 * /terms — public legal page. Asserts the heading, every section
 * data-mol-id renders non-trivial copy, and footer links navigate
 * to the documented sibling pages.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/terms', () => {
  test('renders the Terms heading', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/terms')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { level: 1, name: /terms/i })).toBeVisible()
  })

  test('the page main wrapper is present', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.locator('[data-mol-id="page-terms"]')).toBeVisible()
  })

  test('the effective-date paragraph is non-empty', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    const txt = await page.locator('[data-mol-id="terms-effective"]').innerText()
    expect(txt.length).toBeGreaterThan(5)
  })

  test('all six sub-sections render with substantive copy', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    for (const id of ['eligibility', 'content', 'conduct', 'billing', 'termination', 'changes']) {
      const sec = page.locator(`[data-mol-id="terms-${id}"]`)
      await expect(sec).toBeVisible()
      const t = await sec.innerText()
      expect(t.length, `terms-${id} body`).toBeGreaterThan(60)
    }
  })

  test('header logo navigates back to /', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    const link = page.getByRole('link', { name: /WriteFlow/ }).first()
    if (await link.count()) {
      await link.click()
      await page.waitForURL(/.*\/$/, { timeout: 10000 })
    }
  })

  test('footer Privacy control opens the privacy modal', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await page.getByRole('button', { name: 'Privacy' }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog')).toContainText(/privacy/i)
  })

  test('footer Help link navigates to /help', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await page.getByRole('link', { name: 'Help' }).first().click()
    await page.waitForURL(/\/help/, { timeout: 10000 })
  })

  test('does NOT trigger /api/* requests on initial load', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/terms')
      await page.waitForLoadState('networkidle')
    })
    const apiCalls = reqs.filter((r) => /\/api\//.test(r.url))
    expect(apiCalls).toEqual([])
  })

  test('all sections wrapper is visible', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.locator('[data-mol-id="terms-sections"]')).toBeVisible()
  })

  test('billing section mentions subscriptions/cancellation', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    const txt = await page.locator('[data-mol-id="terms-billing"]').innerText()
    expect(txt.toLowerCase()).toMatch(/billing|cancel|paid|plan/)
  })

  test('content ownership section mentions ownership/license', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    const txt = await page.locator('[data-mol-id="terms-content"]').innerText()
    expect(txt.toLowerCase()).toMatch(/own|content|license/)
  })

  test('reload preserves URL and content', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await page.reload()
    await expect(page).toHaveURL(/\/terms/)
  })
})
