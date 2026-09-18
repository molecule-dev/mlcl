import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE } from './_helpers'

/**
 * Theme toggle on the auth shell — proves toggling actually flips the
 * underlying CSS-variables theme provider AND the choice persists in
 * localStorage across reload (persistKey: 'molecule-theme').
 *
 * Past failure: ThemeToggle that flipped aria-pressed but never called
 * provider.setTheme — assertions on aria alone passed while the page
 * stayed in the original theme. We assert on `document.documentElement`
 * data attributes that the css-variables provider sets, AND on the
 * persisted localStorage value.
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

test('Theme toggle on signup page flips theme AND persists across reload', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  // Discard any leftover persisted theme from a prior test in the same browser
  await page.evaluate(() => window.localStorage.removeItem('molecule-theme'))
  await page.reload()
  await page.waitForLoadState('domcontentloaded')

  const before = await readThemeName(page)
  // Default theme is 'light' per app-theme-css-variables.ts
  expect(before === '' || before.toLowerCase().includes('light')).toBe(true)

  // Click the toggle (aria-label="Toggle theme" via i18n default)
  const toggle = page.getByRole('button', { name: /(toggle theme|dark|light)/i }).first()
  await expect(toggle).toBeVisible()
  await toggle.click()
  // Theme provider updates synchronously, but allow a microtask
  await page.waitForTimeout(150)

  const after = await readThemeName(page)
  expect(after, `expected theme to change after toggle, got "${after}" (was "${before}")`).not.toBe(
    before,
  )
  expect(after.toLowerCase()).toContain('dark')

  // Persistence: reload and re-read
  await page.reload()
  await page.waitForLoadState('domcontentloaded')
  const persisted = await readThemeName(page)
  expect(persisted, 'theme should persist across reload via molecule-theme localStorage key').toBe(
    after,
  )
})
