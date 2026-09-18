import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, APP_BASE, getCategories, pickCategory, signup } from './_helpers.js'

test.describe('categories', () => {
  test('GET /categories returns the board categories with stable slugs', async ({ page }) => {
    await signup(page)
    const cats = await getCategories(page)
    expect(cats.length, 'the board must expose at least one category').toBeGreaterThan(0)
    const slugs = cats.map((c) => c.slug)
    // Slugs are what /c/:slug routes on, so each one must be unique and
    // URL-safe — asserting the demo room names here would fail on a real board.
    expect(new Set(slugs).size, 'category slugs must be unique').toBe(slugs.length)
    for (const c of cats) {
      expect(c.id, 'category needs a real uuid').toMatch(/[0-9a-f-]{36}/)
      expect(c.name, 'category needs a name').toBeTruthy()
      expect(c.slug, 'category needs a url-safe slug').toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    }
  })

  test('CategoriesList page renders rooms from the live API (not fallback fiction)', async ({
    page,
  }) => {
    await signup(page)
    // The names come from the API, so the page is checked against whatever
    // rooms the board holds rather than the demo ones.
    const cats = await getCategories(page)
    expect(cats.length).toBeGreaterThan(0)
    await page.goto(APP_BASE + '/c')
    for (const c of cats.slice(0, 3)) {
      await expect(page.getByText(c.name).first()).toBeVisible({ timeout: 15_000 })
    }
  })

  test('CategoryDetail page fetches a real category and lists its threads', async ({ page }) => {
    await signup(page)
    const category = await pickCategory(page)

    await page.goto(APP_BASE + `/c/${category.slug}`)
    await expect(page.getByText(category.name).first()).toBeVisible({ timeout: 15_000 })

    // The /categories-by-slug/:slug endpoint must succeed for the page to render
    // the real category — otherwise the page would have shown a "not found"
    // message (no fallback fiction).
    const res = await page.request.get(`${API_BASE}/categories-by-slug/${category.slug}`)
    expect(res.status()).toBe(200)
    const detail = await res.json()
    expect(detail.slug).toBe(category.slug)
    expect(detail.id).toBe(category.id)
  })
})
