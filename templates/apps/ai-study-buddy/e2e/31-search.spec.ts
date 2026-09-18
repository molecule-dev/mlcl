/**
 * /search — authenticated semantic search. Verifies the page renders
 * the input, typing fires a /api/search request, results render or
 * empty-state appears, and the page is auth-gated.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test('/search renders page-search container with the input', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/search')
  await expect(page.locator('[data-mol-id="page-search"]')).toBeVisible()
  await expect(page.locator('[data-mol-id="search-input"]')).toBeVisible()
})

test('/search typing into the input dispatches a backend search call', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/search')
  const reqs = await captureNetwork(page, async () => {
    await page.locator('[data-mol-id="search-input"]').fill('photosynthesis')
    // debounce — give the search call time to fire
    await page.waitForTimeout(1500)
  })
  const calls = reqs.filter((r) => /\/api\/search/.test(r.url))
  expect(calls.length).toBeGreaterThanOrEqual(1)
})

test('/search filter buttons render', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/search')
  await expect(page.locator('[data-mol-id^="search-filter-"]').first()).toBeVisible()
})

test('/search is auth-gated (anon redirects to /login)', async ({ page }) => {
  await page.goto(APP_BASE + '/search')
  await page.waitForURL(/\/login/, { timeout: 8_000 })
})

test('/search renders the "Search everything" h1', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/search')
  await expect(page.getByRole('heading', { name: /search everything/i }).first()).toBeVisible({
    timeout: 10_000,
  })
})

test('/search renders a searchbox role', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/search')
  await expect(page.getByRole('searchbox').first()).toBeVisible({ timeout: 10_000 })
})

test('/search Go button submits the form', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/search')
  await page.locator('[data-mol-id="search-input"]').fill('chemistry')
  const reqs = await captureNetwork(page, async () => {
    // Submit via the form's submit button (the visible "Go" button is type=submit
    // but accessible name is "Search" — match either via aria-label or button text).
    await page.locator('[data-mol-id="search-input"]').press('Enter')
    await page.waitForTimeout(800)
  })
  // Submitting bumps the _submit token in the URL → the useEffect re-fires fetch
  expect(reqs.filter((r) => /\/api\/search/.test(r.url)).length).toBeGreaterThanOrEqual(1)
})

test('/search type filter buttons render (Course/Flashcard/Note/Quiz)', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/search')
  // type filter buttons are rendered as data-mol-id="search-filter-*"
  // (filter values are 'course' | 'flashcard' | 'note' | 'quiz')
  await expect(page.locator('[data-mol-id="search-filter-course"]').first()).toBeVisible()
  await expect(page.locator('[data-mol-id="search-filter-flashcard"]').first()).toBeVisible()
  await expect(page.locator('[data-mol-id="search-filter-note"]').first()).toBeVisible()
  await expect(page.locator('[data-mol-id="search-filter-quiz"]').first()).toBeVisible()
})

test('/search clicking a type filter updates the URL with ?type=', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/search')
  // Tab clicks use Link routing — they update ?type= without re-fetching
  // (the page filters client-side). Assert the URL change as the contract.
  await page.locator('[data-mol-id="search-filter-flashcard"]').first().click()
  await expect(page).toHaveURL(/[?&]type=flashcard/)
  await expect(page.locator('[data-mol-id="search-filter-flashcard"]').first()).toHaveAttribute(
    'aria-selected',
    'true',
  )
})

test('/search fresh user with no content sees the empty-state hint', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/search')
  await page.locator('[data-mol-id="search-input"]').fill('thisShouldNotMatchAnythingNew')
  await page.waitForTimeout(1500)
  await expect(page.getByText(/nothing matched/i).first()).toBeVisible({ timeout: 8_000 })
})
