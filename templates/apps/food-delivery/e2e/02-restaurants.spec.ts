import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  type CatalogRestaurant,
  categoryOf,
  getRestaurants,
  pickTwoCategories,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('restaurants list', () => {
  test('renders the catalog and the category filter narrows results', async ({ page }) => {
    await signup(page, uniqueEmail('fd-restaurants'))
    // Read the restaurants under test from the same endpoint the page reads,
    // so the spec still holds after the demo catalog is replaced.
    const catalog = (await getRestaurants(page)) as CatalogRestaurant[]
    await page.goto(APP_BASE + '/restaurants')

    // The cuisine chips are the app's own fixed list, so not every catalog
    // category necessarily has one — drive the first that does. Target the
    // chips nav by its aria-label: the page's FIRST navigation is the
    // TopNavLayout primary nav (links, not buttons), which broke the old
    // `.first()`-based locator. Chip names match the whole accessible name,
    // case-insensitively: a bare string is a SUBSTRING match, so a
    // category-less merchant row ('') matched every chip.
    const chips = page.getByRole('navigation', { name: /filter by cuisine/i })
    const chipFor = (category: string) =>
      chips.getByRole('button', {
        name: new RegExp(`^${category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      })
    let pair: { target: CatalogRestaurant; other: CatalogRestaurant } | null = null
    for (const candidate of catalog) {
      const outside = catalog.find((r) => categoryOf(r) !== categoryOf(candidate))
      if (!outside) continue
      if (await chipFor(categoryOf(candidate)).count()) {
        pair = { target: candidate, other: outside }
        break
      }
    }
    if (!pair) throw new Error('catalog needs two categories, one of them with a filter chip')
    const { target, other } = pair

    // .first() — a live catalog can legitimately hold several rows with the
    // same name (merchant-created test rows persist across suite runs), and
    // a bare name locator is a strict-mode violation.
    await expect(page.getByRole('heading', { name: target.name }).first()).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByRole('heading', { name: other.name }).first()).toBeVisible()
    // The unfiltered list is the whole catalog — one card per row.
    await expect(
      page.getByTestId('restaurants-section').getByRole('heading', { level: 3 }),
    ).toHaveCount(catalog.length)

    // The chip for the target's category narrows the list to it and hides the
    // other one.
    await chipFor(categoryOf(target)).click()
    await expect(page.getByRole('heading', { name: target.name }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: other.name })).toHaveCount(0)

    // Switching back to All restores the others.
    await page.getByRole('button', { name: /^All$/ }).click()
    await expect(page.getByRole('heading', { name: other.name }).first()).toBeVisible()
  })

  test('clicking a restaurant card navigates to its menu page', async ({ page }) => {
    await signup(page, uniqueEmail('fd-rest-menu-nav'))
    const { target } = await pickTwoCategories(page)
    await page.goto(APP_BASE + '/restaurants')

    await page.getByRole('heading', { name: target.name }).first().click()
    await expect(page).toHaveURL(/\/restaurant\/[0-9a-f-]+/, { timeout: 10_000 })
    // The menu page header shows the restaurant name.
    await expect(page.getByRole('heading', { name: target.name, level: 1 })).toBeVisible()
    // Menu items render.
    await expect(page.getByTestId('menu-item').first()).toBeVisible()
  })
})
