import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  captureNetwork,
  expectNoConsoleErrors,
  flipThemeAndAssertChanged,
} from './_helpers.js'

test.describe('/ (Landing)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_BASE + '/')
  })

  test('renders the brand link with "Lexlet home" aria-label', async ({ page }) => {
    await expect(page.getByRole('link', { name: /lexlet home/i })).toBeVisible()
  })

  test('How it works anchor link points to #how', async ({ page }) => {
    const link = page.getByRole('link', { name: /^how it works$/i }).first()
    await expect(link).toHaveAttribute('href', '#how')
  })

  test('Streaks anchor link points to #streaks', async ({ page }) => {
    const link = page.getByRole('link', { name: /streaks & stats/i }).first()
    await expect(link).toHaveAttribute('href', '#streaks')
  })

  test('Leaderboard anchor link points to #community', async ({ page }) => {
    const link = page.getByRole('link', { name: /^leaderboard$/i }).first()
    await expect(link).toHaveAttribute('href', '#community')
  })

  test('toggle theme button flips html data-theme', async ({ page }) => {
    await flipThemeAndAssertChanged(page)
  })

  test('Sign in nav link → /login', async ({ page }) => {
    await page
      .getByRole('link', { name: /^sign in$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('Get started nav link → /signup', async ({ page }) => {
    await page
      .getByRole('link', { name: /^get started$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('Hero CTA → /signup (anonymous)', async ({ page }) => {
    await page
      .getByRole('link', { name: /start playing free/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('Hero "How to play" → /how-to-play', async ({ page }) => {
    await page
      .getByRole('link', { name: /^how to play$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/how-to-play$/)
  })

  test('Bottom CTA → /signup', async ({ page }) => {
    await page
      .getByRole('link', { name: /play your first word/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('"Privacy policy" footer link → /privacy', async ({ page }) => {
    await page
      .getByRole('link', { name: /privacy policy/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/privacy$/)
  })

  test('"Terms of service" footer link → /terms', async ({ page }) => {
    await page
      .getByRole('link', { name: /terms of service/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/terms$/)
  })

  test('Language switcher button is present', async ({ page }) => {
    const btn = page.getByRole('button', { name: /language/i }).first()
    await expect(btn).toBeVisible()
  })

  test('Hero H1 contains "six tries"', async ({ page }) => {
    await expect(page.locator('h1').first()).toContainText(/six tries/i)
  })

  test('static demo board section renders alongside the share-card teaser', async ({ page }) => {
    // The landing demo board is static — structure only, no API data.
    await expect(page.getByRole('heading', { name: /streaks you hate to break/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /a tiny daily ritual/i })).toBeVisible()
  })

  test('Landing does not call /api/* (captureNetwork sentinel)', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.reload()
      await page.waitForLoadState('networkidle')
    })
    expect(reqs.filter((r) => r.url.includes('/api/'))).toEqual([])
  })

  test('No console errors on initial render', async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.reload()
      await page.waitForLoadState('networkidle')
    })
  })
})
