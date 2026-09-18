import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, expectNoConsoleErrors, signup } from './_helpers.js'

test.describe('discover page', () => {
  test('renders the heading and main shows grid', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/discover')
    await expect(page.getByRole('heading', { name: /^discover$/i, level: 1 })).toBeVisible()
    await expect(page.getByRole('heading', { name: /browse all shows/i })).toBeVisible()
  })

  test('hits /api/shows and /api/episodes on initial load', async ({ page }) => {
    await signup(page)
    const requests = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/discover')
      await page.waitForLoadState('networkidle')
    })
    expect(requests.some((r) => /\/api\/shows(\?|$)/.test(r.url) && r.status === 200)).toBeTruthy()
    expect(
      requests.some((r) => /\/api\/episodes(\?|$)/.test(r.url) && r.status === 200),
    ).toBeTruthy()
  })

  test('"Featured shows" row renders at least one show card', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/discover')
    await expect(page.getByRole('heading', { name: /featured shows/i })).toBeVisible()
    const featuredRow = page.getByRole('heading', { name: /featured shows/i }).locator('..')
    await expect(featuredRow.getByRole('link').first()).toBeVisible()
  })

  test('"Trending now" row renders show cards', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/discover')
    await expect(page.getByRole('heading', { name: /trending now/i })).toBeVisible()
  })

  test('clicking a show card routes to /shows/:id', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/discover')
    const card = page.locator('a[href^="/shows/"]').first()
    await expect(card).toBeVisible()
    await card.click()
    await expect(page).toHaveURL(/\/shows\/[0-9a-f-]{36}$/)
  })

  test('category filter button "Tech" filters the grid', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/discover')
    await page.getByRole('button', { name: /^tech$/i }).click()
    await expect(page.getByRole('button', { name: /^tech$/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('category filter "All" returns to full grid', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/discover')
    await page.getByRole('button', { name: /^tech$/i }).click()
    await page.getByRole('button', { name: /^all$/i }).click()
    await expect(page.getByRole('button', { name: /^all$/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('hero card play CTA navigates to an episode page', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/discover')
    const heroPlay = page.getByRole('link', { name: /play/i }).first()
    if (await heroPlay.count()) {
      await heroPlay.click()
      await expect(page).toHaveURL(/\/episodes\/[0-9a-f-]{36}$/)
    }
  })

  test('"View show" CTA navigates to a show page', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/discover')
    const viewShow = page.getByRole('link', { name: /view show/i }).first()
    if (await viewShow.count()) {
      await viewShow.click()
      await expect(page).toHaveURL(/\/shows\/[0-9a-f-]{36}$/)
    }
  })

  test('discover page renders without console errors', async ({ page }) => {
    await signup(page)
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/discover')
      await expect(page.getByRole('heading', { name: /^discover$/i, level: 1 })).toBeVisible()
    })
  })
})
