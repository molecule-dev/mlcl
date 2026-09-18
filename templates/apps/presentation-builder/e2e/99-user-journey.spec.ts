/**
 * Cross-page kitchen-sink journey: signup → /decks → create deck →
 * editor → add slides → present → exit → settings → reload → confirm
 * that everything persists.
 *
 * The point isn't unit-style coverage; it's catching cross-page
 * regressions where each page works on its own but they don't compose
 * (auth interceptor missing, navigation losing state, etc.).
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup, uniqueEmail } from './_helpers.js'

test('full first-time user journey', async ({ page }) => {
  const email = uniqueEmail('journey')
  const password = 'Journey-Pass-123!'

  // 1. Signup → land on home (Landing)
  await signup(page, email, password)

  // 2. Go to /decks → empty state
  await page.goto(APP_BASE + '/decks')
  await page.waitForLoadState('networkidle')
  await expect(page.getByTestId('decks-empty')).toBeVisible({ timeout: 10_000 })

  // 3. Create deck via empty-state CTA
  await page.getByTestId('new-deck-empty-action').click()
  await page.waitForURL(/\/decks\/[0-9a-f-]+\/edit/, { timeout: 15_000 })
  const deckId = page.url().match(/\/decks\/([0-9a-f-]+)\/edit/)![1]!

  // 4. Rename the deck
  await page.getByTestId('deck-title-input').fill('Journey Deck')
  await page.waitForTimeout(900)

  // 5. Add three slides
  for (let i = 0; i < 3; i += 1) {
    await page.getByTestId('add-slide').click()
    await page.waitForTimeout(400)
  }

  // 6. Tweak first slide layout + transition + speaker notes
  await page.getByTestId('slide-rail-0').click()
  await page.getByTestId('layout-chart').click()
  await page.waitForTimeout(400)
  await page.getByTestId('transition-fade').click()
  await page.waitForTimeout(400)
  await page.getByTestId('speaker-notes').fill('Talk about the chart')
  await page.waitForTimeout(900)

  // 7. Reload editor — title, layout, transition, notes all persisted
  await page.reload()
  await page.waitForLoadState('networkidle')
  await expect(page.getByTestId('deck-title-input')).toHaveValue('Journey Deck')
  await expect(page.getByTestId('layout-chart')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('transition-fade')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('speaker-notes')).toHaveValue('Talk about the chart')

  // 8. Switch to presenter, walk a few slides
  await page.getByTestId('present-link').click()
  await page.waitForURL(/\/present/, { timeout: 10_000 })
  await page.waitForLoadState('networkidle')
  await expect(page.getByTestId('present-slide')).toBeVisible()
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(150)
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(150)

  // 9. Exit presenter back to editor
  await page.getByRole('link', { name: /exit presenter/i }).click()
  await expect(page).toHaveURL(/\/decks\/[0-9a-f-]+\/edit/)

  // 10. Open settings, switch the brand color, reload — must stick (localStorage)
  await page.goto(APP_BASE + '/settings')
  await page.waitForLoadState('networkidle')
  // Brand color picker exists (uses native input[type=color]); skip if absent
  const brand = page.locator('input[type="color"]').first()
  if (await brand.count().catch(() => 0)) {
    await brand.fill('#ec4899')
    await page.waitForTimeout(300)
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(brand).toHaveValue(/#ec4899/i)
  }

  // 11. Bounce back to /decks — Journey Deck must show up
  await page.goto(APP_BASE + '/decks')
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(/Journey Deck/).first()).toBeVisible({ timeout: 10_000 })

  // 12. Walk the rest of the nav links — they all render their pages
  for (const path of ['/templates', '/shared', '/analytics', '/notifications', '/settings']) {
    await page.goto(APP_BASE + path)
    await page.waitForLoadState('networkidle')
    // Just assert no console error / blank screen — header link visible
    await expect(page.getByRole('navigation').first()).toBeVisible()
  }

  // 13. Use deckId so the presentation we created is referenced (not just smoke).
  await page.goto(APP_BASE + `/decks/${deckId}/edit`)
  await page.waitForLoadState('networkidle')
  await expect(page.getByTestId('deck-title-input')).toHaveValue('Journey Deck')
})
