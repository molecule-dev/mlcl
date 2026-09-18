import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { signup } from './_helpers.js'

test.describe('navigation smoke', () => {
  test('all primary nav pages render without console errors', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`))
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(`console.error: ${m.text()}`)
    })

    await signup(page)

    const pages: Array<{ path: string; testId: string }> = [
      { path: '/home', testId: 'home-page' },
      { path: '/search', testId: 'search-page' },
      { path: '/spaces', testId: 'spaces-page' },
      { path: '/templates', testId: '' }, // Templates page has no testid wrapper
      { path: '/notifications', testId: 'notifications-page' },
      { path: '/comments', testId: '' },
      { path: '/team', testId: '' },
      { path: '/trash', testId: 'trash-page' },
      { path: '/settings', testId: 'settings-page' },
    ]

    for (const { path, testId } of pages) {
      await page.goto(path)
      if (testId) {
        await expect(page.getByTestId(testId)).toBeVisible({ timeout: 10_000 })
      } else {
        // For pages without a testid root, just ensure the URL stuck
        // (i.e. AuthGuard didn't bounce us back to /login).
        await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
        await expect(page).toHaveURL(new RegExp(path.replace(/\//g, '\\/')))
      }
    }

    // Filter out "pageerror" caused by missing favicon or other noise we don't care about.
    const realErrors = consoleErrors.filter((e) => {
      if (/favicon/i.test(e)) return false
      if (/manifest\.json/i.test(e)) return false
      if (/material-symbols/i.test(e)) return false
      // Tolerate i18n missing-key warnings (flagship templates use defaultValue fallbacks).
      if (/missing|i18n|translation/i.test(e)) return false
      return true
    })
    expect(realErrors, `unexpected JS errors:\n${realErrors.join('\n')}`).toHaveLength(0)
  })

  test('header user menu reveals a log-out action', async ({ page }) => {
    await signup(page)
    await page.goto('/home')

    // Open the user menu via its aria-label (match either "Open user menu" or "user menu").
    await page.getByRole('button', { name: /user menu/i }).click()
    await expect(page.getByRole('button', { name: /log out|sign out/i }).first()).toBeVisible({
      timeout: 10_000,
    })
  })
})
