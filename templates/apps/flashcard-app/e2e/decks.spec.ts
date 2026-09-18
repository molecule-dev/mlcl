import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/decks', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/decks')
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
  })

  test('GET /api/decks fires on load', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/decks')
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    })
    const list = reqs.find((r) => /\/api\/decks(\?|$)/.test(r.url) && r.method === 'GET')
    expect(list, 'GET /api/decks should fire on /decks').toBeTruthy()
    expect(list!.status).toBeLessThan(300)
  })

  test('clicking + New deck opens the inline create form', async ({ page }) => {
    await page.getByRole('button', { name: /New deck/i }).click()
    await expect(page.getByLabel(/Deck name/i)).toBeVisible()
    await expect(page.getByLabel(/Description/i)).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Category' })).toBeVisible()
  })

  test('category filter Personal flips aria-pressed', async ({ page }) => {
    const personalBtn = page.getByRole('button', { name: /^Personal$/i, pressed: false }).first()
    await personalBtn.click()
    await expect(page.getByRole('button', { name: /^Personal$/i, pressed: true })).toBeVisible()
  })

  test('Deck name input accepts a value', async ({ page }) => {
    await page.getByRole('button', { name: /New deck/i }).click()
    const name = page.getByLabel(/Deck name/i)
    await name.fill('My Test Deck')
    await expect(name).toHaveValue('My Test Deck')
  })

  test('Description input accepts a value', async ({ page }) => {
    await page.getByRole('button', { name: /New deck/i }).click()
    const desc = page.getByLabel(/Description/i)
    await desc.fill('A test description')
    await expect(desc).toHaveValue('A test description')
  })

  test('Category select accepts a value', async ({ page }) => {
    await page.getByRole('button', { name: /New deck/i }).click()
    const cat = page.getByRole('combobox', { name: 'Category' })
    await cat.selectOption('language')
    await expect(cat).toHaveValue('language')
  })

  test('Cancel closes the create form', async ({ page }) => {
    await page.getByRole('button', { name: /New deck/i }).click()
    await expect(page.getByLabel(/Deck name/i)).toBeVisible()
    await page.getByRole('button', { name: /Cancel/i }).click()
    await expect(page.getByLabel(/Deck name/i)).not.toBeVisible({ timeout: 5000 })
  })

  test('Create deck POSTs and navigates to /decks/:id', async ({ page }) => {
    await page.getByRole('button', { name: /New deck/i }).click()
    await page.getByLabel(/Deck name/i).fill('Outcome Deck ' + Date.now())
    await page.getByLabel(/Description/i).fill('outcome desc')
    await page.getByRole('combobox', { name: 'Category' }).selectOption('personal')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /^Create deck$/i }).click()
      await page.waitForURL(/\/decks\/[a-zA-Z0-9-]+/, { timeout: 15_000 })
    })
    await expect(page).toHaveURL(/\/decks\/[a-zA-Z0-9-]+/)
    const created = reqs.find((r) => /\/api\/decks(\?|$)/.test(r.url) && r.method === 'POST')
    expect(created, 'POST /api/decks should fire on Create').toBeTruthy()
    expect(created!.status).toBe(201)

    // Read-after-write: navigate back, the new deck must still be listed.
    await page.goto(APP_BASE + '/decks')
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    const allDeckLinks = page.locator('[data-mol-id^="deck-"]')
    expect(
      await allDeckLinks.count(),
      'newly-created deck must persist on /decks',
    ).toBeGreaterThanOrEqual(1)
  })

  test('clicking a deck row navigates to /decks/:id', async ({ page }) => {
    // Create a deck first so there is at least one row.
    await page.getByRole('button', { name: /New deck/i }).click()
    await page.getByLabel(/Deck name/i).fill('Click Deck ' + Date.now())
    await page.getByRole('button', { name: /^Create deck$/i }).click()
    await page.waitForURL(/\/decks\/[a-zA-Z0-9-]+/, { timeout: 15_000 })
    await page.goto(APP_BASE + '/decks')
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    const firstDeck = page.locator('[data-mol-id^="deck-"]').first()
    await firstDeck.click()
    await expect(page).toHaveURL(/\/decks\/[a-zA-Z0-9-]+/, { timeout: 10_000 })
  })
})
