import { expect, test } from '@molecule/app-e2e-fixtures-default'
import {
  API_BASE,
  APP_BASE,
  captureNetwork,
  createThread,
  pickCategory,
  signup,
} from './_helpers.js'

test.describe('search', () => {
  test('Search input is present and accepts typed query', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/search')
    const input = page.getByRole('searchbox').first()
    await input.fill('hello')
    await expect(input).toHaveValue('hello')
  })

  test('Clear-search button empties the input', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/search')
    const input = page.getByRole('searchbox').first()
    await input.fill('something')
    await expect(input).toHaveValue('something')
    await page.getByRole('button', { name: /Clear search/i }).click()
    await expect(input).toHaveValue('')
  })

  test('Filter chip "Everything" is present and clickable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/search')
    const chip = page.getByRole('button', { name: /Everything|^All$/i }).first()
    await expect(chip).toBeVisible({ timeout: 15_000 })
    await chip.click()
  })

  test('Filter chip "Threads" is present and clickable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/search')
    const chip = page.getByRole('button', { name: /^Threads$/i }).first()
    await expect(chip).toBeVisible({ timeout: 15_000 })
    await chip.click()
  })

  test('Filter chip "Posts" is present and clickable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/search')
    const chip = page.getByRole('button', { name: /^Posts$/i }).first()
    await expect(chip).toBeVisible({ timeout: 15_000 })
    await chip.click()
  })

  test('Filter chip "People" is present and clickable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/search')
    const chip = page.getByRole('button', { name: /^People$/i }).first()
    await expect(chip).toBeVisible({ timeout: 15_000 })
    await chip.click()
  })

  test('Initial empty state ("Type a query to search") is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/search')
    await expect(page.getByText(/Type a query/i)).toBeVisible({ timeout: 15_000 })
  })

  test('Typing fires GET /api/search?q=… (captureNetwork invariant)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/search')
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('searchbox')
        .first()
        .fill('captureSearch' + Date.now())
      await page.waitForTimeout(900)
    })
    const search = reqs.find((r) => /\/api\/search\?q=/.test(r.url) && r.method === 'GET')
    expect(search, 'GET /api/search?q=… must fire after typing').toBeTruthy()
    expect(search!.status).toBe(200)
  })

  test('search endpoint matches threads by title (substring) and returns enriched results', async ({
    page,
  }) => {
    await signup(page)
    const category = await pickCategory(page)
    const marker = `searchprobe${Date.now()}`
    const created = await createThread(page, {
      title: `What about ${marker}? A meta thread`,
      body: 'a search probe',
      categoryId: category.id,
    })

    const res = await page.request.get(`${API_BASE}/search?q=${marker}&type=all`)
    expect(res.status()).toBe(200)
    const data = (await res.json()).data ?? []
    expect(data.length).toBeGreaterThan(0)
    const found = data.find((t: { id: string }) => t.id === created.id)
    expect(found, 'search must include the just-created thread').toBeTruthy()
    expect(found.author.username).toBeTruthy()
    expect(found.category.slug).toBe(category.slug)
  })

  test('Search page renders results matching a real thread title', async ({ page }) => {
    await signup(page)
    const category = await pickCategory(page)
    const marker = `pagesearch${Date.now()}`
    await createThread(page, {
      title: `Page-level search probe — ${marker}`,
      body: 'meta',
      categoryId: category.id,
    })

    await page.goto(APP_BASE + '/search')
    const input = page.getByRole('searchbox').first()
    await input.fill(marker)
    await expect(page.getByText(new RegExp(marker, 'i'))).toBeVisible({ timeout: 15_000 })
  })

  test('Search returns empty when nothing matches', async ({ page }) => {
    await signup(page)
    const res = await page.request.get(
      `${API_BASE}/search?q=nothingmatchesthisquery_${Date.now()}&type=all`,
    )
    expect(res.status()).toBe(200)
    const data = (await res.json()).data ?? []
    expect(data.length).toBe(0)
  })
})
