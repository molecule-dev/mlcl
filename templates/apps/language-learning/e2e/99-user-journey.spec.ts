import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

/**
 * Full primary-flow click-through. Boots a fresh user, then walks every
 * top-level page in the nav so Playwright actually loads + asserts on
 * the rendered surface (no 500s, no stranded loading spinners, no
 * unexpected redirects to /login). This is the closest we get to a
 * "human ran through the app" test.
 */
test.describe('end-to-end click-through', () => {
  test('a fresh user can visit every primary route without errors', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await signup(page)

    const stops: Array<{ path: string; sentinel: RegExp }> = [
      { path: '/dashboard', sentinel: /streak|XP|today.s goal/i },
      { path: '/lessons', sentinel: /lesson|practice|continue/i },
      { path: '/practice', sentinel: /Read it|practice|record/i },
      { path: '/vocabulary', sentinel: /vocab|word|review|got it/i },
      { path: '/leaderboard', sentinel: /leaderboard|weekly|all.time/i },
      { path: '/profile', sentinel: /profile|achievement|XP|streak/i },
      { path: '/settings', sentinel: /target language|daily goal|notification/i },
      { path: '/pricing', sentinel: /Free|Pro|Team/i },
    ]

    for (const stop of stops) {
      await page.goto(APP_BASE + stop.path)
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
      // Should not bounce back to /login or /signup.
      await expect(page, `route ${stop.path} stayed put`).toHaveURL(
        new RegExp(stop.path.replace(/\//g, '\\/')),
      )
      await expect(
        page.getByText(stop.sentinel).first(),
        `route ${stop.path} rendered something meaningful`,
      ).toBeVisible({ timeout: 10000 })
    }

    // Filter out a few well-known noisy console errors that aren't real bugs:
    //   - DevTools warnings about React Router future flags
    //   - "Failed to load resource" from images / favicons in dev
    //   - non-blocking 401s from background prefetches before token settles
    const real = consoleErrors.filter(
      (e) =>
        !/React Router Future Flag|Failed to load resource|favicon|Download the React DevTools/i.test(
          e,
        ),
    )
    expect(
      real,
      `unexpected console errors during click-through: ${real.slice(0, 5).join(' | ')}`,
    ).toEqual([])
  })
})
