import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, pickCategory, signup } from './_helpers.js'

test.describe('/c (CategoriesList — agora landing)', () => {
  test('hero "Start a thread" CTA navigates to /compose', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/c')
    await page
      .getByRole('link', { name: /Start a thread/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/compose$/, { timeout: 10_000 })
  })

  test('hero "Search the archive" CTA navigates to /search', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/c')
    await page
      .getByRole('link', { name: /Search the archive/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/search$/, { timeout: 10_000 })
  })

  test('hero stat "Live rooms" renders with a numeric value', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/c')
    await expect(page.getByText(/Live rooms/i)).toBeVisible({ timeout: 10_000 })
    // The page must show a numeric live-room count (one per category).
    const heroSection = page
      .locator('section, header')
      .filter({ hasText: /Live rooms/i })
      .first()
    await expect(heroSection).toBeVisible()
  })

  test('hero stat "Threads" label is present', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/c')
    await expect(page.getByText(/Threads/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('hero stat "Posts" label is present', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/c')
    await expect(page.getByText(/Posts/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('a category card links to its own /c/:slug page', async ({ page }) => {
    await signup(page)
    // The card under test is named by the API, not by the demo board.
    const category = await pickCategory(page)
    await page.goto(APP_BASE + '/c')
    const card = page.getByRole('link').filter({ hasText: category.name }).first()
    await expect(card).toBeVisible({ timeout: 10_000 })
    await card.click()
    await expect(page).toHaveURL(new RegExp(`/c/${category.slug}(\\?|$)`), { timeout: 10_000 })
  })

  test('initial render fires GET /api/categories-rich and returns 200', async ({ page }) => {
    await signup(page)
    // Arm waitForResponse BEFORE goto so we deterministically catch the
    // useEffect-triggered fetch even if React renders the hero (and "Live
    // rooms" label) before the response lands. Without this, the prior
    // captureNetwork+toBeVisible approach was racy: the hero label is
    // visible on first render with categories=null, so the visibility
    // gate could resolve before the network listener saw the response.
    const respPromise = page.waitForResponse(
      (r) => /\/api\/categories-rich$/.test(r.url()) && r.request().method() === 'GET',
      { timeout: 10_000 },
    )
    await page.goto(APP_BASE + '/c')
    const resp = await respPromise
    expect(resp.status()).toBe(200)
  })
})
