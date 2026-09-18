import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiFetch, signup } from './_helpers'

// The top-bar global search input — labelled "Search secrets by key,
// path, or tag…" with a `/` keyboard hint — must actually search. Past
// agents shipped this as a decorative placeholder (no value, no onChange,
// no submit). The fix routes Enter → /vaults?q=… and the Vaults page
// filters by name/path. The "/" key focuses the box from anywhere.

test.describe('global search', () => {
  test('typing a query and pressing Enter routes to /vaults?q=… and filters', async ({ page }) => {
    await signup(page)
    await apiFetch(page, 'POST', '/vaults', { name: 'apple', environment: 'production' })
    await apiFetch(page, 'POST', '/vaults', { name: 'banana', environment: 'production' })
    await page.goto(APP_BASE + '/vaults')
    await page.waitForTimeout(1000)
    const search = page.locator('[data-mol-id="layout-search"]')
    await expect(search).toBeVisible()
    await search.fill('apple')
    await search.press('Enter')
    await page.waitForURL(/\/vaults\?q=apple/, { timeout: 5000 })
    await page.waitForTimeout(500)
    const list = page.locator('[data-mol-id="vaults-list"]')
    await expect(list).toContainText('apple')
    await expect(list).not.toContainText('banana')
  })

  test('Escape clears the search and routes back to /vaults', async ({ page }) => {
    await signup(page)
    await apiFetch(page, 'POST', '/vaults', { name: 'cherry', environment: 'production' })
    await page.goto(APP_BASE + '/vaults?q=cherry')
    await page.waitForTimeout(800)
    const search = page.locator('[data-mol-id="layout-search"]')
    await search.focus()
    await search.press('Escape')
    await page.waitForURL((u) => /\/vaults$/.test(u.toString()), { timeout: 5000 })
    await expect(search).toHaveValue('')
  })

  test('"/" focuses the search input from anywhere on the page', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/vaults')
    await page.waitForTimeout(500)
    // Click on the page body to ensure the input is not focused.
    await page.locator('body').click({ position: { x: 5, y: 5 } })
    await page.keyboard.press('/')
    const focused = await page.evaluate(
      () => document.activeElement?.getAttribute('data-mol-id') === 'layout-search',
    )
    expect(focused).toBe(true)
  })
})
