/**
 * Challenge: setting a goal persists, and finished books move the
 * needle. Values are read through the API rather than hardcoded.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, getChallenge, seedBook, signup } from './_helpers.js'

test('challenge page renders with no goal and accepts one', async ({ page }) => {
  const { accessToken } = await signup(page)
  await page.goto(APP_BASE + '/challenge')

  // Strict-mode: both the page h1 and the ChallengeHeroCard h2 render
  // "<year> reading challenge" — pin the locator to the page-level h1.
  await expect(page.getByRole('heading', { level: 1, name: /reading challenge/i })).toBeVisible({
    timeout: 10_000,
  })

  await page.locator('[data-mol-id="challenge-goal-input"]').fill('12')
  await page.locator('[data-mol-id="challenge-goal-save"]').click()
  // The goal persists (asserted through the API — pace text depends on the
  // day of the year the suite runs).
  await expect
    .poll(async () => (await getChallenge(page, accessToken)).goal_books, { timeout: 10_000 })
    .toBe(12)
  await expect(page.locator('[data-mol-id="challenge-goal-input"]')).toHaveValue('12')

  const snap = await getChallenge(page, accessToken)
  expect(snap.goal_books).toBe(12)
})

test('finishing a book bumps challenge progress', async ({ page }) => {
  const { accessToken } = await signup(page)
  const before = await getChallenge(page, accessToken)

  // A book created directly on the Read shelf counts as finished this year.
  await seedBook(page, accessToken, 'Challenge Bump', { shelf: 'read' })

  const after = await getChallenge(page, accessToken)
  expect(after.books_read).toBe(before.books_read + 1)

  await page.goto(APP_BASE + '/challenge')
  await expect(page.getByText(/books finished this year/i)).toBeVisible({ timeout: 10_000 })
})
