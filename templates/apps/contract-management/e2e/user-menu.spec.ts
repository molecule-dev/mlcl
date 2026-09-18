/**
 * /dashboard user-menu — theme toggle + logout. The SidebarLayout has no top
 * bar so the theme toggle lives inside the user-menu panel; verify clicking
 * it actually swaps the CSS variables (background) and the choice persists
 * across reload, and that signing out clears the JWT and lands on /login.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, getAccessToken, signup } from './_helpers.js'

test.describe('user menu', () => {
  test('theme toggle swaps background tokens and persists', async ({ page }) => {
    await signup(page)
    await page.goto(`${APP_BASE}/dashboard`)
    await page.waitForLoadState('networkidle')

    const sample = () =>
      page.evaluate(() => {
        const style = getComputedStyle(document.documentElement)
        return (
          style.getPropertyValue('--mol-color-background').trim() ||
          style.getPropertyValue('--mol-color-surface').trim()
        )
      })

    const before = await sample()
    expect(before).not.toBe('')

    // Open user-menu panel
    await page
      .getByRole('button', { name: /open user menu|user menu|account/i })
      .first()
      .click()
    const themeBtn = page.locator('[data-testid="user-menu-theme-toggle"]')
    await expect(themeBtn).toBeVisible()
    await themeBtn.click()

    // Wait for state to settle
    await page.waitForTimeout(300)
    const after = await sample()
    expect(after).not.toBe(before)

    // Reload and confirm the new theme stuck
    await page.reload({ waitUntil: 'networkidle' })
    const persisted = await sample()
    expect(persisted).toBe(after)
  })

  test('sign out clears the JWT and lands on /login without firing a 404', async ({ page }) => {
    await signup(page)
    await page.goto(`${APP_BASE}/dashboard`)
    await page.waitForLoadState('networkidle')

    const failedRequests: { url: string; status: number }[] = []
    page.on('response', (resp) => {
      const url = resp.url()
      if (url.includes('/auth/logout') || url.endsWith('/api/auth/logout')) {
        failedRequests.push({ url, status: resp.status() })
      }
    })

    await page
      .getByRole('button', { name: /open user menu|user menu|account/i })
      .first()
      .click()
    await page
      .getByRole('button', { name: /sign out|log out|logout/i })
      .first()
      .click()
    await page.waitForURL('**/login', { timeout: 10_000 })

    const tokenAfter = await getAccessToken(page)
    expect(tokenAfter).toBeNull()
    expect(failedRequests).toEqual([])
  })
})
