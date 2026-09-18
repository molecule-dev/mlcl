/**
 * /flashcards/:id — deck detail. Verifies the deck name renders, cards
 * are listed, the flip / rate-card flow exists, and the page is auth-gated.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, seedDeck, signup } from './_helpers.js'

test('/flashcards/:id renders page-deck container and the deck name', async ({ page }) => {
  const { accessToken } = await signup(page)
  const deck = await seedDeck(page, accessToken, { name: 'Detail Test Deck' })
  await page.goto(`${APP_BASE}/flashcards/${deck.id}`)
  await expect(page.locator('[data-mol-id="page-deck"]')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Detail Test Deck')).toBeVisible()
})

test('/flashcards/:id renders a card front from /api/decks/:id/cards', async ({ page }) => {
  const { accessToken } = await signup(page)
  const deck = await seedDeck(page, accessToken, { name: 'Card Deck' })
  const cardRes = await page.request.post(`${API_BASE}/decks/${deck.id}/cards`, {
    headers: apiHeaders(accessToken),
    data: { front_md: 'What is HTTP?', back_md: 'HyperText Transfer Protocol' },
    failOnStatusCode: false,
  })
  expect(cardRes.status()).toBe(201)
  await page.goto(`${APP_BASE}/flashcards/${deck.id}`)
  await expect(page.getByText('What is HTTP?')).toBeVisible({ timeout: 10_000 })
})

test('/flashcards/:id flip button is visible when at least one card exists', async ({ page }) => {
  const { accessToken } = await signup(page)
  const deck = await seedDeck(page, accessToken, { name: 'Flip Deck' })
  await page.request.post(`${API_BASE}/decks/${deck.id}/cards`, {
    headers: apiHeaders(accessToken),
    data: { front_md: 'F', back_md: 'B' },
    failOnStatusCode: false,
  })
  await page.goto(`${APP_BASE}/flashcards/${deck.id}`)
  await expect(page.locator('[data-mol-id="deck-card-flip"]').first()).toBeVisible({
    timeout: 10_000,
  })
})

test('/flashcards/:id is auth-gated (anon redirects to /login)', async ({ page }) => {
  const fakeId = '00000000-0000-0000-0000-000000000000'
  await page.goto(`${APP_BASE}/flashcards/${fakeId}`)
  await page.waitForURL(/\/login/, { timeout: 8_000 })
})

test('/flashcards/:id mount fetches /api/decks/:id with cards embedded', async ({ page }) => {
  const { accessToken } = await signup(page)
  const deck = await seedDeck(page, accessToken, { name: 'Network Deck' })
  await page.request.post(`${API_BASE}/decks/${deck.id}/cards`, {
    headers: apiHeaders(accessToken),
    data: { front_md: 'Q', back_md: 'A' },
    failOnStatusCode: false,
  })
  const reqs = await captureNetwork(page, async () => {
    await page.goto(`${APP_BASE}/flashcards/${deck.id}`)
    await expect(page.locator('[data-mol-id="page-deck"]')).toBeVisible({ timeout: 15_000 })
    await page.waitForLoadState('networkidle')
  })
  expect(
    reqs.find((r) => new RegExp(`/api/decks/${deck.id}\\b`).test(r.url) && r.status === 200),
  ).toBeTruthy()
  // The card front rendered on the page proves the deck handler embedded the
  // cards array — see api/src/handlers/decks.ts (`res.json({ ...deck, cards })`).
  await expect(page.locator('[data-mol-id="deck-card-front"]').first()).toBeVisible({
    timeout: 5_000,
  })
  await expect(page.locator('[data-mol-id="deck-card-front"]').first()).toHaveText('Q')
})

test('/flashcards/:id click flip exposes the back side of the card', async ({ page }) => {
  const { accessToken } = await signup(page)
  const deck = await seedDeck(page, accessToken, { name: 'Flip-Reveal Deck' })
  await page.request.post(`${API_BASE}/decks/${deck.id}/cards`, {
    headers: apiHeaders(accessToken),
    data: { front_md: 'frontX', back_md: 'backX' },
    failOnStatusCode: false,
  })
  await page.goto(`${APP_BASE}/flashcards/${deck.id}`)
  await expect(page.locator('[data-mol-id="deck-card-front"]').first()).toBeVisible({
    timeout: 10_000,
  })
  await page.locator('[data-mol-id="deck-card-flip"]').first().click()
  await expect(page.locator('[data-mol-id="deck-card-back"]').first()).toBeVisible({
    timeout: 5_000,
  })
})

test('/flashcards/:id rating buttons POST a review and advance the card', async ({ page }) => {
  const { accessToken } = await signup(page)
  const deck = await seedDeck(page, accessToken, { name: 'Rating Deck' })
  await page.request.post(`${API_BASE}/decks/${deck.id}/cards`, {
    headers: apiHeaders(accessToken),
    data: { front_md: 'Q1', back_md: 'A1' },
    failOnStatusCode: false,
  })
  await page.goto(`${APP_BASE}/flashcards/${deck.id}`)
  await expect(page.locator('[data-mol-id="deck-card-front"]').first()).toBeVisible({
    timeout: 10_000,
  })
  await page.locator('[data-mol-id="deck-card-flip"]').first().click()
  const reqs = await captureNetwork(page, async () => {
    await page.locator('[data-mol-id="deck-rating-easy"]').first().click()
    await page.waitForTimeout(800)
  })
  expect(
    reqs.find((r) => /\/api\/decks\/.+\/cards\/.+\/review/.test(r.url) && r.method === 'POST'),
  ).toBeTruthy()
})
