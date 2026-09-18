import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers'

/**
 * Theme toggle on the auth shell — proves toggling actually flips the
 * underlying CSS-variables theme provider AND the choice persists in
 * localStorage across reload (persistKey: 'molecule-theme').
 *
 * Past failure: ThemeToggle that flipped aria-label/icon but never
 * called provider.setTheme — assertions on aria alone passed while the
 * page stayed in the original theme. We assert on the persisted
 * localStorage value AND on the html element's data-theme attribute.
 */

async function readThemeName(page: import('@playwright/test').Page): Promise<string> {
  return await page.evaluate(() => {
    return (
      window.localStorage.getItem('molecule-theme') ||
      document.documentElement.getAttribute('data-theme') ||
      ''
    )
  })
}

test('Theme toggle flips theme on /dashboard AND persists across reload', async ({ page }) => {
  // ThemeToggle lives in CreatorSidebarLayout (logged-in only), not AuthShell,
  // so we must sign up first before the button exists in the DOM.
  await signup(page)
  await page.evaluate(() => window.localStorage.removeItem('molecule-theme'))
  await page.reload()
  await page.waitForLoadState('domcontentloaded')

  const before = await readThemeName(page)
  expect(before === '' || before.toLowerCase().includes('light')).toBe(true)

  // Click the toggle (aria-label="Toggle theme" via i18n default)
  const toggle = page.getByRole('button', { name: /toggle theme/i }).first()
  await expect(toggle).toBeVisible({ timeout: 10_000 })
  await toggle.click()
  await page.waitForTimeout(200)

  const after = await readThemeName(page)
  expect(after, `expected theme to change after toggle, got "${after}" (was "${before}")`).not.toBe(
    before,
  )
  expect(after.toLowerCase()).toContain('dark')

  await page.reload()
  await page.waitForLoadState('domcontentloaded')
  const persisted = await readThemeName(page)
  expect(persisted, 'theme should persist across reload via molecule-theme localStorage key').toBe(
    after,
  )
})
