import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, expectNoConsoleErrors, pickShow, signup } from './_helpers.js'

test.describe('search page', () => {
  test('renders heading and search box', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/search')
    await expect(page.getByRole('heading', { name: /^search$/i, level: 1 })).toBeVisible()
    await expect(page.getByRole('searchbox')).toBeVisible()
  })

  test('initial load fetches /api/shows and /api/episodes for the catalog index', async ({
    page,
  }) => {
    await signup(page)
    const requests = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/search')
      await page.waitForLoadState('networkidle')
    })
    expect(requests.some((r) => /\/api\/shows/.test(r.url) && r.status === 200)).toBeTruthy()
    expect(requests.some((r) => /\/api\/episodes/.test(r.url) && r.status === 200)).toBeTruthy()
  })

  test('typing into the searchbox filters results client-side', async ({ page }) => {
    await signup(page)
    // Search for a show the catalog actually holds — naming a seeded title
    // breaks this spec the moment the demo catalog is replaced.
    const show = await pickShow(page)
    await page.goto(APP_BASE + '/search')
    const sb = page.getByRole('searchbox')
    await sb.fill(show.title)
    await expect(page.getByRole('link', { name: show.title }).first()).toBeVisible({
      timeout: 8000,
    })
  })

  test('"Shows" filter button filters to shows-only', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/search')
    await page.getByRole('button', { name: /^shows$/i }).click()
    await expect(page.getByRole('button', { name: /^shows$/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('"Episodes" filter button filters to episodes-only', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/search')
    await page.getByRole('button', { name: /^episodes$/i }).click()
    await expect(page.getByRole('button', { name: /^episodes$/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('clicking a show result routes to /shows/:id', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/search')
    const showLink = page.locator('a[href^="/shows/"]').first()
    await expect(showLink).toBeVisible({ timeout: 8000 })
    await showLink.click()
    await expect(page).toHaveURL(/\/shows\/[0-9a-f-]{36}$/)
  })

  test('clicking an episode result routes to /episodes/:id', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/search')
    const epLink = page.locator('a[href^="/episodes/"]').first()
    await expect(epLink).toBeVisible({ timeout: 8000 })
    await epLink.click()
    await expect(page).toHaveURL(/\/episodes\/[0-9a-f-]{36}$/)
  })

  test('search page renders without console errors', async ({ page }) => {
    await signup(page)
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/search')
      await expect(page.getByRole('searchbox')).toBeVisible()
    })
  })
})
