import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup, uniqueEmail } from './_helpers.js'

test.describe('settings · theme persistence', () => {
  test('toggling the theme persists across reload', async ({ page }) => {
    await signup(page, uniqueEmail('settings-theme'), 'TestPass123!')
    await page.goto(APP_BASE + '/settings')

    // Theme starts light — html has neither the dark class nor data-mol-mode="dark".
    const isDark = () =>
      page.evaluate(
        () =>
          document.documentElement.classList.contains('dark') ||
          document.documentElement.getAttribute('data-mol-mode') === 'dark',
      )
    expect(await isDark()).toBe(false)

    // The Appearance card renders the shared ThemeToggle (data-mol-id="theme-toggle").
    const themeToggle = page.locator('[data-mol-id="theme-toggle"]').first()
    await expect(themeToggle).toBeVisible({ timeout: 5000 })
    await themeToggle.click()

    // After click the theme bond flips the root into dark mode.
    await expect.poll(isDark, { timeout: 5000 }).toBe(true)

    // The theme bond persists the active theme under its own key.
    const stored = await page.evaluate(() => window.localStorage.getItem('molecule-theme'))
    expect(stored).toBeTruthy()

    // Reload — dark mode should still be applied immediately (no flash of light).
    await page.reload()
    await expect.poll(isDark, { timeout: 5000 }).toBe(true)

    // Toggle back off again.
    await page.locator('[data-mol-id="theme-toggle"]').first().click()
    await expect.poll(isDark, { timeout: 5000 }).toBe(false)
  })
})
