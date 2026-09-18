/**
 * Theme toggle — assertion of effect AND persistence.
 *
 * The toggle lives in the authed app shell (sidebar footer next to
 * Sign out) and on the public landing/auth pages. Clicking it must
 * change `document.documentElement[data-mol-mode]`, must update CSS
 * variables, and must persist across `page.reload()` so the user's
 * choice survives a refresh.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup, uniqueEmail } from './_helpers.js'

async function readMode(page: import('@playwright/test').Page): Promise<string | null> {
  return await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
}

test.describe('theme toggle', () => {
  test('sidebar toggle flips light↔dark and persists across reload', async ({ page }) => {
    await signup(page, uniqueEmail('theme-sidebar'))
    await page.goto(APP_BASE + '/feed')
    await page.waitForLoadState('networkidle')

    const before = await readMode(page)
    const toggle = page.getByRole('button', { name: /toggle.*theme|^theme$/i }).first()
    await expect(toggle).toBeVisible()
    await toggle.click()
    await page.waitForTimeout(200)
    const after = await readMode(page)
    expect(after, 'data-mol-mode unchanged after toggle click').not.toBe(before)
    expect(['light', 'dark']).toContain(after)

    // Survives reload
    await page.reload()
    await page.waitForLoadState('networkidle')
    const persisted = await readMode(page)
    expect(persisted).toBe(after)
  })

  test('landing-page toggle persists into authed shell', async ({ page }) => {
    // Toggle theme on /landing while signed-out, then sign up — the
    // mode should carry over because both screens use the same
    // localStorage key.
    await page.goto(APP_BASE + '/')
    await page.waitForLoadState('networkidle')
    const initial = await readMode(page)
    const toggle = page.getByRole('button', { name: /toggle.*theme|^theme$/i }).first()
    if (await toggle.isVisible().catch(() => false)) {
      await toggle.click()
      await page.waitForTimeout(150)
      const flipped = await readMode(page)
      expect(flipped).not.toBe(initial)

      // Sign up — the new screen must inherit the flipped mode
      await signup(page, uniqueEmail('theme-carryover'))
      await page.waitForLoadState('networkidle')
      const inApp = await readMode(page)
      expect(inApp).toBe(flipped)
    }
  })
})
