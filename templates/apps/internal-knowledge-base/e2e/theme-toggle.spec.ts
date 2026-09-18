import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

/**
 * The CairnLayout sidebar exposes a `<ThemeToggle />` next to the user
 * menu. Clicking it must:
 *   1. Flip the active theme (data-mol-theme on <html>).
 *   2. Persist the new theme to localStorage under `molecule-theme`.
 *   3. Survive a full page reload (i.e. theme provider rehydrates from
 *      storage).
 *
 * This regression locks in the wiring that adds `themeToggle={...}` to
 * the SidebarLayout — without it, the button never renders and the
 * theme is stuck on the default forever.
 */
test('Theme toggle flips <html data-mol-theme> and persists across reload', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/home')
  // Wait for the sidebar to mount + the theme provider to apply the default.
  await expect(page.locator('button[aria-label*="theme" i]').first()).toBeVisible({
    timeout: 10_000,
  })

  const before = await page.evaluate(() => document.documentElement.getAttribute('data-mol-theme'))
  expect(before).toBeTruthy() // Provider applied a theme on mount

  await page.locator('button[aria-label*="theme" i]').first().click()
  await page.waitForTimeout(300)

  const after = await page.evaluate(() => document.documentElement.getAttribute('data-mol-theme'))
  expect(after).not.toBe(before)

  // Persisted to localStorage
  const persisted = await page.evaluate(() => localStorage.getItem('molecule-theme'))
  expect(persisted).toBe(after)

  // Survives a full reload — the provider rehydrates from localStorage.
  await page.reload()
  await page.waitForTimeout(800)
  const reloaded = await page.evaluate(() =>
    document.documentElement.getAttribute('data-mol-theme'),
  )
  expect(reloaded).toBe(after)
})
