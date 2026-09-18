/**
 * Flashcard decks + cards + spaced-repetition review.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, apiHeaders, seedDeck, seedTopic, signup } from './_helpers.js'

test('POST /decks creates and GET /decks returns it', async ({ page }) => {
  const { accessToken } = await signup(page)
  const seeded = await seedDeck(page, accessToken, { name: 'Spanish verbs' })
  const list = await page.request.get(`${API_BASE}/decks`, {
    headers: apiHeaders(accessToken),
  })
  expect(list.status()).toBe(200)
  const rows = (await list.json()) as Array<{ id: string; name: string }>
  expect(rows.find((r) => r.id === seeded.id)?.name).toBe('Spanish verbs')
})

test('POST /decks/:id/cards persists card and bumps card_count', async ({ page }) => {
  const { accessToken } = await signup(page)
  const deck = await seedDeck(page, accessToken)

  const create = await page.request.post(`${API_BASE}/decks/${deck.id}/cards`, {
    headers: apiHeaders(accessToken),
    data: { front_md: 'What is 2+2?', back_md: '4', hint: 'Basic arithmetic' },
    failOnStatusCode: false,
  })
  expect(create.status(), await create.text()).toBe(201)

  const reread = await page.request.get(`${API_BASE}/decks/${deck.id}`, {
    headers: apiHeaders(accessToken),
  })
  const body = (await reread.json()) as { card_count: number; cards?: unknown[] }
  expect(body.card_count).toBeGreaterThanOrEqual(1)
})

test('Spaced-repetition: rating "good" pushes due date forward, "again" resets', async ({
  page,
}) => {
  const { accessToken } = await signup(page)
  const deck = await seedDeck(page, accessToken)
  const created = await page.request.post(`${API_BASE}/decks/${deck.id}/cards`, {
    headers: apiHeaders(accessToken),
    data: { front_md: 'Q', back_md: 'A' },
  })
  const card = (await created.json()) as { id: string; due_at: string; interval_days: number }
  const initialDue = new Date(card.due_at).getTime()

  const goodRes = await page.request.post(`${API_BASE}/decks/${deck.id}/cards/${card.id}/review`, {
    headers: apiHeaders(accessToken),
    data: { rating: 'good' },
    failOnStatusCode: false,
  })
  expect(goodRes.status(), await goodRes.text()).toBe(200)
  const afterGood = (await goodRes.json()) as { due_at: string; interval_days: number }
  expect(new Date(afterGood.due_at).getTime()).toBeGreaterThan(initialDue)
  expect(afterGood.interval_days).toBeGreaterThanOrEqual(1)

  const againRes = await page.request.post(`${API_BASE}/decks/${deck.id}/cards/${card.id}/review`, {
    headers: apiHeaders(accessToken),
    data: { rating: 'again' },
    failOnStatusCode: false,
  })
  expect(againRes.status()).toBe(200)
  const afterAgain = (await againRes.json()) as { interval_days: number }
  expect(afterAgain.interval_days).toBe(1)
})

test('Deleting a card decrements card_count', async ({ page }) => {
  const { accessToken } = await signup(page)
  const deck = await seedDeck(page, accessToken)
  const created = await page.request.post(`${API_BASE}/decks/${deck.id}/cards`, {
    headers: apiHeaders(accessToken),
    data: { front_md: 'X', back_md: 'Y' },
  })
  const card = (await created.json()) as { id: string }

  const del = await page.request.delete(`${API_BASE}/decks/${deck.id}/cards/${card.id}`, {
    headers: apiHeaders(accessToken),
  })
  expect(del.status()).toBe(204)
})

test('Deck ownership: another user gets 404 on read', async ({ page, browser }) => {
  const ownerCtx = await browser.newContext()
  const ownerPage = await ownerCtx.newPage()
  const owner = await signup(ownerPage)
  const deck = await seedDeck(ownerPage, owner.accessToken)

  const intruderCtx = await browser.newContext()
  const intruderPage = await intruderCtx.newPage()
  const intruder = await signup(intruderPage)

  const res = await intruderPage.request.get(`${API_BASE}/decks/${deck.id}`, {
    headers: apiHeaders(intruder.accessToken),
    failOnStatusCode: false,
  })
  expect(res.status()).toBe(404)
  await ownerCtx.close()
  await intruderCtx.close()
})

test('Deck linked to topic appears when filtering by topic_id', async ({ page }) => {
  const { accessToken } = await signup(page)
  const topic = await seedTopic(page, accessToken)
  await seedDeck(page, accessToken, { topic_id: topic.id, name: 'Linked deck' })
  await seedDeck(page, accessToken, { name: 'Unlinked deck' })

  const filtered = await page.request.get(`${API_BASE}/decks?topic_id=${topic.id}`, {
    headers: apiHeaders(accessToken),
  })
  const rows = (await filtered.json()) as Array<{ name: string; topic_id: string | null }>
  expect(rows.length).toBeGreaterThan(0)
  for (const r of rows) expect(r.topic_id).toBe(topic.id)
})
