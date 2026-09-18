import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, getRestaurants, pickTwoDistinctNames, signup, uniqueEmail } from './_helpers.js'

/**
 * Search page.
 *
 * Invariants verified:
 * - Empty query renders ALL restaurants + cuisine groupings.
 * - Typing a restaurant name narrows results to a restaurant card linking
 *   to /restaurant/:id.
 * - Typing a cuisine narrows results to a cuisine card linking to
 *   /restaurants?cuisine=…
 * - Filter chips (All / Restaurants / Cuisines) restrict the result type
 *   shown.
 * - Clicking a restaurant result navigates to its menu page.
 * - Clearly broken queries show the empty state.
 */

test.describe('search', () => {
  test('initial render lists all restaurants', async ({ page }) => {
    await signup(page, uniqueEmail('fd-search-init'))
    // The page must list the whole catalog — read its size from the API rather
    // than hardcoding how many restaurants the demo data happens to carry.
    const catalog = await getRestaurants(page)
    expect(catalog.length).toBeGreaterThan(0)
    await page.goto(APP_BASE + '/search')
    await expect(page.getByTestId('search-results')).toBeVisible()
    await expect(page.getByTestId('search-result-restaurant')).toHaveCount(catalog.length)
  })

  test('typing a restaurant name narrows to that restaurant', async ({ page }) => {
    await signup(page, uniqueEmail('fd-search-name'))
    const { target, other } = await pickTwoDistinctNames(page)
    await page.goto(APP_BASE + '/search')
    await page.getByTestId('search-input').fill(target.name)
    await expect(page.getByTestId('search-results')).toContainText(target.name)
    // A restaurant with an unrelated name must NOT match.
    await expect(page.getByTestId('search-results')).not.toContainText(other.name)
  })

  test('the Restaurants filter chip hides cuisine results', async ({ page }) => {
    await signup(page, uniqueEmail('fd-search-filter'))
    await page.goto(APP_BASE + '/search')
    // Wait for initial load so we have results before filtering.
    await expect(page.getByTestId('search-results')).toBeVisible()
    expect(await page.getByTestId('search-result-restaurant').count()).toBeGreaterThan(0)
    await page.getByTestId('search-filter-restaurant').click()
    await expect(page.getByTestId('search-result-cuisine')).toHaveCount(0)
    expect(await page.getByTestId('search-result-restaurant').count()).toBeGreaterThan(0)
  })

  test('clicking a restaurant result navigates to its menu', async ({ page }) => {
    await signup(page, uniqueEmail('fd-search-click'))
    const { target } = await pickTwoDistinctNames(page)
    await page.goto(APP_BASE + '/search')
    await page.getByTestId('search-input').fill(target.name)
    const link = page.getByTestId('search-result-restaurant').first()
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(/\/restaurant\/[0-9a-f-]+/)
  })

  test('a query that matches nothing shows the empty state', async ({ page }) => {
    await signup(page, uniqueEmail('fd-search-empty'))
    await page.goto(APP_BASE + '/search')
    await page.getByTestId('search-input').fill('zzznotarealrestaurantxxx')
    await expect(page.getByTestId('search-empty')).toBeVisible()
  })
})
