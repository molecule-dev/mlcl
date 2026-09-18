import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup, uniqueEmail } from './_helpers.js'

/**
 * Theme toggle.
 *
 * Invariants verified:
 * - Click the theme button toggles the data-theme attribute on <html> from
 *   'light' → 'dark' (or vice versa).
 * - The choice persists in localStorage under `molecule-theme`.
 * - Choice survives a full reload.
 */

test.describe('theme', () => {
  test('toggling the theme persists across reload', async ({ page }) => {
    await signup(page, uniqueEmail('fd-theme'))
    await page.goto(APP_BASE + '/restaurants')

    // The CSS-variables theme provider applies attributes prefixed by `mol`.
    const getMode = () =>
      page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    const before = await getMode()
    const themeToggle = page.getByRole('button', { name: /toggle theme/i }).first()
    await expect(themeToggle).toBeVisible({ timeout: 5_000 })
    await themeToggle.click()
    await page.waitForFunction(
      (b) => document.documentElement.getAttribute('data-mol-mode') !== b,
      before,
      { timeout: 5_000 },
    )
    const after = await getMode()
    expect(after).not.toBe(before)
    expect(['light', 'dark']).toContain(after)

    const stored = await page.evaluate(() => window.localStorage.getItem('molecule-theme'))
    expect(stored).toBeTruthy()

    await page.reload()
    await expect.poll(getMode, { timeout: 5_000 }).toBe(after)
  })
})
