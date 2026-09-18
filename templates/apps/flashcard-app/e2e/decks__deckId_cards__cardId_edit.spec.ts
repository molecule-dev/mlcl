import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

async function createDeckWithCard(page: any) {
  await page.goto(APP_BASE + '/decks')
  await page.getByRole('button', { name: /New deck/i }).click()
  await page.getByLabel(/Deck name/i).fill('Edit Deck ' + Date.now())
  await page.getByRole('button', { name: /^Create deck$/i }).click()
  await page.waitForURL(/\/decks\/[a-zA-Z0-9-]+/, { timeout: 15_000 })
  const deckId = (page.url().match(/\/decks\/([a-zA-Z0-9-]+)/) || [])[1] || ''
  await page.goto(APP_BASE + `/decks/${deckId}/cards/new`)
  const front = 'Original front ' + Date.now()
  await page.getByLabel(/^Front$/i).fill(front)
  await page.getByLabel(/^Back$/i).fill('Original back')
  await page.getByLabel(/Tags/i).fill('orig, tag')
  await page.getByRole('button', { name: /Create card/i }).click()
  await page.waitForURL(new RegExp(`/decks/${deckId}$`), { timeout: 15_000 })
  // Pull cards from the API to find the new card's id (avoids depending on UI selectors)
  const apiBase =
    process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'
  const res = await page.request.get(apiBase + '/cards?deck_id=' + deckId)
  const json = await res.json()
  const list: any[] = Array.isArray(json) ? json : json.data || json.results || json.cards || []
  const cardId = list[0]?.id || ''
  return { deckId, cardId, front }
}

test.describe('/decks/:deckId/cards/:cardId/edit', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
  })

  test('GET /api/cards/:id fires on load and pre-fills the form', async ({ page }) => {
    const { deckId, cardId, front } = await createDeckWithCard(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/decks/${deckId}/cards/${cardId}/edit`)
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    })
    const get = reqs.find((r) => r.url.includes('/api/cards/' + cardId) && r.method === 'GET')
    expect(get, 'GET /api/cards/:id should fire on edit load').toBeTruthy()
    expect(get!.status).toBeLessThan(300)
    await expect(page.getByLabel(/^Front$/i)).toHaveValue(front)
    await expect(page.getByLabel(/^Back$/i)).toHaveValue('Original back')
  })

  test('Back to deck link navigates to /decks/:deckId', async ({ page }) => {
    const { deckId, cardId } = await createDeckWithCard(page)
    await page.goto(APP_BASE + `/decks/${deckId}/cards/${cardId}/edit`)
    await page.getByRole('link', { name: /Back to deck/i }).click()
    await expect(page).toHaveURL(new RegExp(`/decks/${deckId}$`))
  })

  test('Front textarea is editable', async ({ page }) => {
    const { deckId, cardId } = await createDeckWithCard(page)
    await page.goto(APP_BASE + `/decks/${deckId}/cards/${cardId}/edit`)
    const front = page.getByLabel(/^Front$/i)
    await front.fill('Edited front')
    await expect(front).toHaveValue('Edited front')
  })

  test('Back textarea is editable', async ({ page }) => {
    const { deckId, cardId } = await createDeckWithCard(page)
    await page.goto(APP_BASE + `/decks/${deckId}/cards/${cardId}/edit`)
    const back = page.getByLabel(/^Back$/i)
    await back.fill('Edited back')
    await expect(back).toHaveValue('Edited back')
  })

  test('Tags input is editable', async ({ page }) => {
    const { deckId, cardId } = await createDeckWithCard(page)
    await page.goto(APP_BASE + `/decks/${deckId}/cards/${cardId}/edit`)
    const tags = page.getByLabel(/Tags/i)
    await tags.fill('new, tags')
    await expect(tags).toHaveValue('new, tags')
  })

  test('Save changes PUTs and the new front survives reload (read-after-write)', async ({
    page,
  }) => {
    const { deckId, cardId } = await createDeckWithCard(page)
    await page.goto(APP_BASE + `/decks/${deckId}/cards/${cardId}/edit`)
    const newFront = 'Persisted front ' + Date.now()
    await page.getByLabel(/^Front$/i).fill(newFront)
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Save changes/i }).click()
      await page.waitForURL(new RegExp(`/decks/${deckId}$`), { timeout: 15_000 })
    })
    const put = reqs.find((r) => r.url.includes('/api/cards/' + cardId) && r.method === 'PUT')
    expect(put, 'PUT /api/cards/:id should fire on Save').toBeTruthy()
    expect(put!.status).toBeLessThan(300)
    // Reload edit page; new front must be there.
    await page.goto(APP_BASE + `/decks/${deckId}/cards/${cardId}/edit`)
    await expect(page.getByLabel(/^Front$/i)).toHaveValue(newFront)
  })
})
