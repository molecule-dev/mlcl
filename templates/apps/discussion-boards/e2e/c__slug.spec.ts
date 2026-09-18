import { expect, test } from '@molecule/app-e2e-fixtures-default'
import {
  API_BASE,
  APP_BASE,
  captureNetwork,
  createThread,
  pickCategory,
  signup,
} from './_helpers.js'

// Every test drives a category read from /api/categories rather than a named
// room: the demo board is the first thing an app's owner replaces.

test.describe('/c/:slug (CategoryDetail)', () => {
  test('header renders the category name from the API', async ({ page }) => {
    await signup(page)
    const category = await pickCategory(page)
    await page.goto(APP_BASE + `/c/${category.slug}`)
    await expect(page.getByText(category.name).first()).toBeVisible({ timeout: 15_000 })
  })

  test('"Categories" breadcrumb navigates back to /c', async ({ page }) => {
    await signup(page)
    const category = await pickCategory(page)
    await page.goto(APP_BASE + `/c/${category.slug}`)
    await expect(page.getByText(category.name).first()).toBeVisible({ timeout: 15_000 })
    await page
      .getByRole('link', { name: /Categories/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/c$/, { timeout: 10_000 })
  })

  test('"Start a thread" header CTA → /compose?category=:slug', async ({ page }) => {
    await signup(page)
    const category = await pickCategory(page)
    await page.goto(APP_BASE + `/c/${category.slug}`)
    const cta = page.getByRole('link', { name: /Start a thread/i }).first()
    await expect(cta).toBeVisible({ timeout: 15_000 })
    await cta.click()
    await expect(page).toHaveURL(new RegExp(`/compose\\?category=${category.slug}`), {
      timeout: 10_000,
    })
  })

  test('"Most recent" sort button stays selectable', async ({ page }) => {
    await signup(page)
    const category = await pickCategory(page)
    await page.goto(APP_BASE + `/c/${category.slug}`)
    const btn = page.getByRole('button', { name: /Most recent/i })
    await expect(btn).toBeVisible({ timeout: 15_000 })
    await btn.click()
    await expect(btn).toBeVisible()
  })

  test('"Top this week" sort button is clickable', async ({ page }) => {
    await signup(page)
    const category = await pickCategory(page)
    await page.goto(APP_BASE + `/c/${category.slug}`)
    const btn = page.getByRole('button', { name: /Top this week/i })
    await expect(btn).toBeVisible({ timeout: 15_000 })
    await btn.click()
    await expect(btn).toBeVisible()
  })

  test('"Unanswered" sort filter applies (newly created thread = 0 replies)', async ({ page }) => {
    await signup(page)
    const category = await pickCategory(page)
    const t1 = await createThread(page, {
      title: `Unanswered probe ${Date.now()}`,
      body: 'still unanswered',
      categoryId: category.id,
    })
    await page.goto(APP_BASE + `/c/${category.slug}`)
    await expect(page.getByText(t1.title).first()).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: /Unanswered/i }).click()
    await expect(page.getByText(t1.title).first()).toBeVisible({ timeout: 10_000 })
  })

  test('a freshly created thread in this category shows up in the list', async ({ page }) => {
    await signup(page)
    const category = await pickCategory(page)
    const probe = await createThread(page, {
      title: `Read-after-write probe ${Date.now()}`,
      body: 'fresh',
      categoryId: category.id,
    })
    await page.goto(APP_BASE + `/c/${category.slug}`)
    await expect(page.getByText(probe.title).first()).toBeVisible({ timeout: 15_000 })
  })

  test('initial render fires GET /api/categories-by-slug/:slug + GET /api/categories/:slug/threads', async ({
    page,
  }) => {
    await signup(page)
    const category = await pickCategory(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/c/${category.slug}`)
      await expect(page.getByText(category.name).first()).toBeVisible({ timeout: 15_000 })
    })
    const detail = reqs.find(
      (r) =>
        new RegExp(`/api/categories-by-slug/${category.slug}$`).test(r.url) && r.method === 'GET',
    )
    expect(detail, 'GET /api/categories-by-slug/:slug must have fired').toBeTruthy()
    expect(detail!.status).toBe(200)

    const list = reqs.find(
      (r) =>
        new RegExp(`/api/categories/${category.slug}/threads$`).test(r.url) && r.method === 'GET',
    )
    expect(list, 'GET /api/categories/:slug/threads must have fired').toBeTruthy()
    expect(list!.status).toBe(200)

    // and the equivalent direct API surface still exists for completeness
    const r = await page.request.get(API_BASE + `/categories-by-slug/${category.slug}`)
    expect(r.status()).toBe(200)
  })
})
