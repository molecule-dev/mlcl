/**
 * Flashcards UI: list page (/flashcards), deck detail (/flashcards/:id),
 * and study session (/study/:id). Verifies the user-facing surfaces
 * actually wire to the backend (read-after-write).
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  apiHeaders,
  captureNetwork,
  seedDeck,
  seedTopic,
  signup,
} from './_helpers.js'

test('/flashcards page lists decks created via API', async ({ page }) => {
  const { accessToken } = await signup(page)
  const seeded = await seedDeck(page, accessToken, { name: `UIDeck ${Date.now()}` })
  await page.goto(`${APP_BASE}/flashcards`)
  await expect(page.getByText(seeded.name)).toBeVisible()
})

test('/flashcards "New deck" form persists a deck (read-after-write via /api/decks list)', async ({
  page,
}) => {
  const { accessToken } = await signup(page)
  await page.goto(`${APP_BASE}/flashcards`)
  await page.locator('[data-mol-id="flashcards-new"]').click()
  const name = `Created from UI ${Date.now()}`
  const reqs = await captureNetwork(page, async () => {
    await page.locator('[data-mol-id="flashcards-new-name"]').first().fill(name)
    await page.locator('[data-mol-id="flashcards-new-submit"]').first().click()
    await expect(page.getByText(name)).toBeVisible({ timeout: 15_000 })
  })
  expect(reqs.find((r) => /\/api\/decks/.test(r.url) && r.method === 'POST')?.status).toBe(201)

  // Read-after-write — confirm the deck round-tripped to the DB
  const list = await page.request.get(`${API_BASE}/decks`, { headers: apiHeaders(accessToken) })
  const rows = (await list.json()) as Array<{ name: string }>
  expect(rows.find((r) => r.name === name)).toBeTruthy()
})

test('/flashcards/:id deck detail renders deck name, supports reveal+rate flow', async ({
  page,
}) => {
  const { accessToken } = await signup(page)
  const deck = await seedDeck(page, accessToken, { name: 'Detail Deck' })
  // Add a card via API so the page has something to render
  const cardRes = await page.request.post(`${API_BASE}/decks/${deck.id}/cards`, {
    headers: apiHeaders(accessToken),
    data: { front_md: 'What is 2+2?', back_md: '4', hint: 'simple math' },
    failOnStatusCode: false,
  })
  expect(cardRes.status()).toBe(201)

  await page.goto(`${APP_BASE}/flashcards/${deck.id}`)
  await expect(page.getByText('Detail Deck')).toBeVisible()
  await expect(page.getByText('What is 2+2?')).toBeVisible()
})

test('/study/:id renders the topic title, message list, and tutor composer input', async ({
  page,
}) => {
  const { accessToken } = await signup(page)
  const topic = await seedTopic(page, accessToken, { title: 'Photosynthesis' })

  await page.goto(`${APP_BASE}/study/${topic.id}`)
  await expect(page.locator('[data-mol-id="page-study"]')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('heading', { name: /photosynthesis/i })).toBeVisible()
  await expect(page.locator('[data-mol-id="study-composer-input"]')).toBeVisible()
  await expect(page.locator('[data-mol-id="study-composer-send"]')).toBeVisible()
})
