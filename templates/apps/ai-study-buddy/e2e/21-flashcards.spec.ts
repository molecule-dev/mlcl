/**
 * /flashcards — authenticated deck list and "New deck" form. Verifies
 * the page renders existing decks, the create flow persists, and a
 * read-after-write GET /api/decks reflects the new row.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, seedDeck, signup } from './_helpers.js'

test('/flashcards renders the page-flashcards container after auth', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/flashcards')
  await expect(page.locator('[data-mol-id="page-flashcards"]')).toBeVisible()
})

test('/flashcards lists a deck created via API (read-through)', async ({ page }) => {
  const { accessToken } = await signup(page)
  const seeded = await seedDeck(page, accessToken, { name: `Seed Deck ${Date.now()}` })
  await page.goto(APP_BASE + '/flashcards')
  await expect(page.getByText(seeded.name)).toBeVisible()
})

test('/flashcards "New deck" form persists a deck to /api/decks', async ({ page }) => {
  const { accessToken } = await signup(page)
  await page.goto(APP_BASE + '/flashcards')
  await page.locator('[data-mol-id="flashcards-new"]').click()
  const name = `UI Deck ${Date.now()}`
  const reqs = await captureNetwork(page, async () => {
    await page.locator('[data-mol-id="flashcards-new-name"]').fill(name)
    await page.locator('[data-mol-id="flashcards-new-submit"]').click()
    await expect(page.getByText(name)).toBeVisible({ timeout: 10_000 })
  })
  expect(reqs.find((r) => /\/api\/decks/.test(r.url) && r.method === 'POST')?.status).toBe(201)
  const list = await page.request.get(`${API_BASE}/decks`, { headers: apiHeaders(accessToken) })
  const rows = (await list.json()) as Array<{ name: string }>
  expect(rows.find((r) => r.name === name)).toBeTruthy()
})

test('/flashcards empty state renders when user has no decks', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/flashcards')
  await expect(page.locator('[data-mol-id="page-flashcards"]')).toBeVisible()
  await expect(page.locator('[data-mol-id="flashcards-empty"]')).toBeVisible()
})

test('/flashcards "New deck" toggle reveals the inline form fields', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/flashcards')
  await page.locator('[data-mol-id="flashcards-new"]').click()
  await expect(page.locator('[data-mol-id="flashcards-new-name"]')).toBeVisible()
  await expect(page.locator('[data-mol-id="flashcards-new-submit"]')).toBeVisible()
})

test('/flashcards deck tile link routes to /flashcards/:id', async ({ page }) => {
  const { accessToken } = await signup(page)
  const seeded = await seedDeck(page, accessToken, { name: `Routing Deck ${Date.now()}` })
  await page.goto(APP_BASE + '/flashcards')
  await page.locator('[data-mol-id="flashcards-deck-link"]').first().click()
  await page.waitForURL(new RegExp(`/flashcards/${seeded.id}`), { timeout: 8_000 })
})
