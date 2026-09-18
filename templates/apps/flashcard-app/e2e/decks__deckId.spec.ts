import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

async function createDeck(page: any, name = 'Detail Deck ' + Date.now()) {
  await page.goto(APP_BASE + '/decks')
  await page.getByRole('button', { name: /New deck/i }).click()
  await page.getByLabel(/Deck name/i).fill(name)
  await page.getByRole('combobox', { name: 'Category' }).selectOption('personal')
  await page.getByRole('button', { name: /^Create deck$/i }).click()
  await page.waitForURL(/\/decks\/[a-zA-Z0-9-]+/, { timeout: 15_000 })
  const m = page.url().match(/\/decks\/([a-zA-Z0-9-]+)/)
  return m ? m[1] : ''
}

test.describe('/decks/:deckId', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
  })

  test('GET /api/decks/:id and GET /api/cards?deck_id= fire on load', async ({ page }) => {
    const deckId = await createDeck(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/decks/' + deckId)
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    })
    const deckGet = reqs.find((r) => r.url.includes('/api/decks/' + deckId) && r.method === 'GET')
    const cardsGet = reqs.find((r) => /\/api\/cards\?deck_id=/.test(r.url) && r.method === 'GET')
    expect(deckGet, 'GET /api/decks/:id should fire on load').toBeTruthy()
    expect(cardsGet, 'GET /api/cards?deck_id= should fire on load').toBeTruthy()
    expect(deckGet!.status).toBeLessThan(300)
    expect(cardsGet!.status).toBeLessThan(300)
  })

  test('All decks back link navigates to /decks', async ({ page }) => {
    const deckId = await createDeck(page)
    await page.goto(APP_BASE + '/decks/' + deckId)
    await page.getByRole('link', { name: /All decks/i }).click()
    await expect(page).toHaveURL(/\/decks$/)
  })

  test('New card link navigates to /decks/:id/cards/new', async ({ page }) => {
    const deckId = await createDeck(page)
    await page.goto(APP_BASE + '/decks/' + deckId)
    await page.getByRole('link', { name: /New card/i }).click()
    await expect(page).toHaveURL(new RegExp(`/decks/${deckId}/cards/new`))
  })

  test('card-state filter "New" flips aria-pressed', async ({ page }) => {
    const deckId = await createDeck(page)
    await page.goto(APP_BASE + '/decks/' + deckId)
    const newBtn = page.getByRole('button', { name: /^New$/i, pressed: false }).first()
    await newBtn.click()
    await expect(page.getByRole('button', { name: /^New$/i, pressed: true })).toBeVisible()
  })

  test('newly-created card appears on detail page (read-after-write)', async ({ page }) => {
    const deckId = await createDeck(page)
    await page.goto(APP_BASE + `/decks/${deckId}/cards/new`)
    const front = page.getByLabel(/Front/i).first()
    const back = page.getByLabel(/Back/i).first()
    await front.fill('Capital of France?')
    await back.fill('Paris')
    await page
      .getByRole('button', { name: /Add card|Create card|Save/i })
      .first()
      .click()
    // After save we either land on detail or stay on form. Visit detail explicitly.
    await page.goto(APP_BASE + '/decks/' + deckId)
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    await expect(page.getByText('Capital of France?')).toBeVisible({ timeout: 10_000 })
  })
})
