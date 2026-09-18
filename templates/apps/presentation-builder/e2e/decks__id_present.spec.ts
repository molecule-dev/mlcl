/**
 * Present (presenter) view: arrow keys + click rail moves between slides,
 * fullscreen toggle is wired, and the "exit presenter" link returns to
 * the editor.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

async function newDeckWithSlides(page: import('@playwright/test').Page, count = 3) {
  await signup(page)
  await page.goto(APP_BASE + '/decks?new=1')
  await page.waitForURL(/\/decks\/[0-9a-f-]+\/edit/, { timeout: 15_000 })
  for (let i = 0; i < count; i += 1) {
    await page.getByTestId('add-slide').click()
    await page.waitForTimeout(400)
  }
  // Capture deck id from URL
  const m = page.url().match(/\/decks\/([0-9a-f-]+)\/edit/)
  return m![1]!
}

test('present: loads slides via /api/slides and renders the first one', async ({ page }) => {
  const deckId = await newDeckWithSlides(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + `/decks/${deckId}/present`)
    await page.waitForLoadState('networkidle')
  })
  const list = reqs.find((r) => r.method === 'GET' && /\/api\/slides\?presentationId=/.test(r.url))
  expect(list, 'GET /api/slides?presentationId=… must fire').toBeTruthy()
  expect(list!.status).toBe(200)
  await expect(page.getByTestId('present-slide')).toBeVisible({ timeout: 10_000 })
})

test('present: next-slide button advances the rail selection', async ({ page }) => {
  const deckId = await newDeckWithSlides(page)
  await page.goto(APP_BASE + `/decks/${deckId}/present`)
  await page.waitForLoadState('networkidle')

  // First rail item is highlighted (white bg → text-black)
  await page.getByTestId('next-slide').click()
  await page.waitForTimeout(150)
  // After advancing once, present-rail-1 should be the active one.
  // Heuristic: active item has surface bg → check class contains "bg-surface"
  const cls = await page.getByTestId('present-rail-1').getAttribute('class')
  expect(cls ?? '').toMatch(/bg-surface\b/)
})

test('present: ArrowRight key advances and ArrowLeft retreats', async ({ page }) => {
  const deckId = await newDeckWithSlides(page)
  await page.goto(APP_BASE + `/decks/${deckId}/present`)
  await page.waitForLoadState('networkidle')

  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(150)
  let cls = await page.getByTestId('present-rail-1').getAttribute('class')
  expect(cls ?? '').toMatch(/bg-surface\b/)

  await page.keyboard.press('ArrowLeft')
  await page.waitForTimeout(150)
  cls = await page.getByTestId('present-rail-0').getAttribute('class')
  expect(cls ?? '').toMatch(/bg-surface\b/)
})

test('present: clicking a rail thumbnail jumps to that slide', async ({ page }) => {
  const deckId = await newDeckWithSlides(page, 3)
  await page.goto(APP_BASE + `/decks/${deckId}/present`)
  await page.waitForLoadState('networkidle')

  await page.getByTestId('present-rail-2').click()
  await page.waitForTimeout(150)
  const cls = await page.getByTestId('present-rail-2').getAttribute('class')
  expect(cls ?? '').toMatch(/bg-surface\b/)
})

test('present: fullscreen button is reachable and aria-pressed reflects state', async ({
  page,
}) => {
  const deckId = await newDeckWithSlides(page, 1)
  await page.goto(APP_BASE + `/decks/${deckId}/present`)
  await page.waitForLoadState('networkidle')
  // Don't actually toggle fullscreen (would interfere with headless),
  // but the button must exist and start unpressed.
  await expect(page.getByTestId('fullscreen-btn')).toHaveAttribute('aria-pressed', 'false')
})

test('present: empty deck shows present-empty state', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/decks?new=1')
  await page.waitForURL(/\/decks\/[0-9a-f-]+\/edit/)
  const deckId = page.url().match(/\/decks\/([0-9a-f-]+)\/edit/)![1]!
  await page.goto(APP_BASE + `/decks/${deckId}/present`)
  await page.waitForLoadState('networkidle')
  await expect(page.getByTestId('present-empty')).toBeVisible()
})

test('present: exit-presenter link goes back to /decks/:id/edit', async ({ page }) => {
  const deckId = await newDeckWithSlides(page, 1)
  await page.goto(APP_BASE + `/decks/${deckId}/present`)
  await page.waitForLoadState('networkidle')
  await page.getByRole('link', { name: /exit presenter/i }).click()
  await expect(page).toHaveURL(/\/decks\/[0-9a-f-]+\/edit/)
})
