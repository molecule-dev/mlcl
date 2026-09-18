import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { signup } from './_helpers.js'

test.describe('theme persistence', () => {
  test('toggling the theme updates <html data-mol-mode> AND survives page reload', async ({
    page,
  }) => {
    await signup(page)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle').catch(() => null)

    const before = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))

    // Find a Theme/Dark/Light button. The ForjaTopBar renders a `Toggle theme` button.
    const themeBtn = page
      .getByRole('button', { name: /theme|dark.*mode|light.*mode/i })
      .or(page.locator('button[aria-label*="theme" i]'))
      .first()
    // count() never auto-waits; a pre-paint read skipped this test silently.
    const present = await themeBtn
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false)
    if (!present) {
      test.skip(true, 'no theme toggle in this layout')
      return
    }

    await themeBtn.click()
    // Theme is set via data-mol-mode, and persisted in localStorage.
    await page.waitForFunction(
      (prev) => document.documentElement.getAttribute('data-mol-mode') !== prev,
      before,
      { timeout: 5000 },
    )
    const after = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    expect(after).not.toBe(before)
    expect(after).toBeTruthy()

    await page.reload()
    await page.waitForLoadState('networkidle').catch(() => null)
    await page.waitForTimeout(500)
    const persisted = await page.evaluate(() =>
      document.documentElement.getAttribute('data-mol-mode'),
    )
    expect(persisted).toBe(after)
  })
})
