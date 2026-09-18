import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, expectNoConsoleErrors, signup } from './_helpers.js'

test.describe('library page', () => {
  test('renders heading and tab navigation', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/library')
    await expect(page.getByRole('heading', { name: /your library/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /subscribed shows/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /saved episodes/i })).toBeVisible()
  })

  test('initial load fetches /api/subscriptions/shows and /api/episodes?saved=true', async ({
    page,
  }) => {
    await signup(page)
    const requests = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/library')
      await page.waitForLoadState('networkidle')
    })
    expect(
      requests.some((r) => /\/api\/subscriptions\/shows/.test(r.url) && r.status === 200),
    ).toBeTruthy()
    expect(
      requests.some((r) => /\/api\/episodes\?[^"]*saved=true/.test(r.url) && r.status === 200),
    ).toBeTruthy()
  })

  test('shows tab is selected by default and lists at least one subscribed show', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/library')
    await expect(page.getByRole('button', { name: /subscribed shows/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    // The per-user demo seed subscribes the new account to two shows.
    await expect(page.locator('a[href^="/shows/"]').first()).toBeVisible({ timeout: 8000 })
  })

  test('switching to "Saved episodes" tab toggles the active state', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/library')
    await page.getByRole('button', { name: /saved episodes/i }).click()
    await expect(page.getByRole('button', { name: /saved episodes/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('saved-episodes tab lists the seeded saved episode', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/library')
    await page.getByRole('button', { name: /saved episodes/i }).click()
    await expect(page.locator('a[href^="/episodes/"]').first()).toBeVisible({ timeout: 8000 })
  })

  test('clicking a subscribed show routes to /shows/:id', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/library')
    const showLink = page.locator('a[href^="/shows/"]').first()
    await expect(showLink).toBeVisible()
    await showLink.click()
    await expect(page).toHaveURL(/\/shows\/[0-9a-f-]{36}$/)
  })

  test('library page renders without console errors', async ({ page }) => {
    await signup(page)
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/library')
      await expect(page.getByRole('heading', { name: /your library/i })).toBeVisible()
    })
  })
})
