import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

async function createDeck(page: any, name = 'CardNew Deck ' + Date.now()) {
  await page.goto(APP_BASE + '/decks')
  await page.getByRole('button', { name: /New deck/i }).click()
  await page.getByLabel(/Deck name/i).fill(name)
  await page.getByRole('button', { name: /^Create deck$/i }).click()
  await page.waitForURL(/\/decks\/[a-zA-Z0-9-]+/, { timeout: 15_000 })
  const m = page.url().match(/\/decks\/([a-zA-Z0-9-]+)/)
  return m ? m[1] : ''
}

test.describe('/decks/:deckId/cards/new', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
  })

  test('Back to deck link navigates to /decks/:deckId', async ({ page }) => {
    const deckId = await createDeck(page)
    await page.goto(APP_BASE + `/decks/${deckId}/cards/new`)
    await page.getByRole('link', { name: /Back to deck/i }).click()
    await expect(page).toHaveURL(new RegExp(`/decks/${deckId}$`))
  })

  test('Front textarea accepts a value', async ({ page }) => {
    const deckId = await createDeck(page)
    await page.goto(APP_BASE + `/decks/${deckId}/cards/new`)
    const front = page.getByLabel(/^Front$/i).first()
    await front.fill('Capital of Japan?')
    await expect(front).toHaveValue('Capital of Japan?')
  })

  test('Back textarea accepts a value', async ({ page }) => {
    const deckId = await createDeck(page)
    await page.goto(APP_BASE + `/decks/${deckId}/cards/new`)
    const back = page.getByLabel(/^Back$/i).first()
    await back.fill('Tokyo')
    await expect(back).toHaveValue('Tokyo')
  })

  test('Tags input accepts comma-separated values', async ({ page }) => {
    const deckId = await createDeck(page)
    await page.goto(APP_BASE + `/decks/${deckId}/cards/new`)
    const tags = page.getByLabel(/Tags/i).first()
    await tags.fill('geo, capitals')
    await expect(tags).toHaveValue('geo, capitals')
  })

  test('Cancel link navigates back to /decks/:deckId without saving', async ({ page }) => {
    const deckId = await createDeck(page)
    await page.goto(APP_BASE + `/decks/${deckId}/cards/new`)
    await page.getByLabel(/^Front$/i).fill('Should not save')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('link', { name: /^Cancel$/i }).click()
      await expect(page).toHaveURL(new RegExp(`/decks/${deckId}$`))
    })
    const post = reqs.find((r) => /\/api\/cards(\?|$)/.test(r.url) && r.method === 'POST')
    expect(post, 'Cancel must NOT trigger POST /api/cards').toBeFalsy()
  })

  test('Create card POSTs and the card appears on the deck (read-after-write)', async ({
    page,
  }) => {
    const deckId = await createDeck(page)
    await page.goto(APP_BASE + `/decks/${deckId}/cards/new`)
    const front = 'Outcome card front ' + Date.now()
    await page.getByLabel(/^Front$/i).fill(front)
    await page.getByLabel(/^Back$/i).fill('Outcome card back')
    await page.getByLabel(/Tags/i).fill('outcome')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Create card/i }).click()
      await page.waitForURL(new RegExp(`/decks/${deckId}$`), { timeout: 15_000 })
    })
    const post = reqs.find((r) => /\/api\/cards(\?|$)/.test(r.url) && r.method === 'POST')
    expect(post, 'POST /api/cards should fire').toBeTruthy()
    expect(post!.status).toBe(201)
    // Read-after-write: visit detail; card must be in list.
    await page.goto(APP_BASE + '/decks/' + deckId)
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    await expect(page.getByText(front)).toBeVisible({ timeout: 10_000 })
  })
})
