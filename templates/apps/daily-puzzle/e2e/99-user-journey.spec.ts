import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, bearerToken, logout, signup } from './_helpers.js'

/**
 * The full first-session loop: land → sign up → play today's word (type,
 * invalid-word toast, valid-guess feedback) → stats → archive → practice →
 * leaderboard → sign out. Structure-only assertions; no fixture content.
 */
test('signup → play → stats → archive → practice → leaderboard → logout', async ({ page }) => {
  // ─── 1. Landing renders the brand ───────────────────────────────────
  await page.goto(APP_BASE + '/')
  await expect(page.getByRole('link', { name: /lexlet home/i })).toBeVisible()

  // ─── 2. Sign up lands directly on today's puzzle ────────────────────
  const { email } = await signup(page)
  await expect(page).toHaveURL(/\/play$/)
  await expect(page.locator('[data-mol-id="board-active-row"]')).toBeVisible()
  const token = await bearerToken(page)
  expect(token).toBeTruthy()

  // ─── 3. Play: invalid word → toast; valid word → feedback ──────────
  // Expected 4xx: the rejected guess POST logs a browser console error.
  test.info().annotations.push({ type: 'allow-console-error', description: 'status of 4\\d\\d' })
  await page.keyboard.type('zzzzz', { delay: 20 })
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-mol-id="game-toast"]')).toHaveText(/not in the word list/i)
  // Invalid guesses KEEP their letters (Wordle-style shake) — clear the row
  // before typing the real word.
  for (let i = 0; i < 5; i++) await page.keyboard.press('Backspace')
  await page.keyboard.type('stone', { delay: 20 })
  const guess = page.waitForResponse((r) => /\/guess$/.test(r.url()))
  await page.keyboard.press('Enter')
  expect((await guess).status()).toBe(201)
  await page.locator('[data-mol-id="puzzle-keyboard"]').waitFor()

  // ─── 4. Stats reflect one ranked attempt in flight ──────────────────
  await page.goto(APP_BASE + '/stats')
  await page.locator('[data-mol-id="stat-played"]').waitFor()
  await expect(page.locator('[data-mol-id="stat-played"]')).toBeVisible()
  await expect(page.locator('[data-mol-id="dist-row-6"]')).toBeVisible()

  // ─── 5. Archive lists past days; open one as practice ───────────────
  await page.goto(APP_BASE + '/archive')
  await page.locator('[data-mol-id="archive-list"]').waitFor()
  await page.locator('[data-mol-id^="archive-link-"]').first().click()
  await expect(page).toHaveURL(/\/archive\/\d{4}-\d{2}-\d{2}$/)
  await expect(page.locator('[data-mol-id="practice-badge"]')).toContainText(/practice/i)

  // ─── 6. Leaderboard shows both boards ───────────────────────────────
  await page.goto(APP_BASE + '/leaderboard')
  await page.locator('[data-mol-id="daily-distribution"]').waitFor()
  await expect(page.locator('[data-mol-id="streak-leaders"]')).toBeVisible()

  // ─── 7. Sign out returns to the public landing ──────────────────────
  await page.goto(APP_BASE + '/settings')
  await page.getByTestId('settings').waitFor()
  await logout(page)
  await page.goto(APP_BASE + '/')
  await expect(page.getByRole('link', { name: /sign in/i }).first()).toBeVisible()
  expect(email).toBeTruthy()
})
