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

  test('renders the brand link with "Sparq home" aria-label', async ({ page }) => {
    await expect(page.getByRole('link', { name: /sparq home/i })).toBeVisible()
  })

  test('Features anchor link points to #features', async ({ page }) => {
    const link = page.getByRole('link', { name: /^features$/i }).first()
    await expect(link).toHaveAttribute('href', '#features')
  })

  test('Popular quizzes anchor link points to #popular', async ({ page }) => {
    const link = page.getByRole('link', { name: /popular quizzes/i }).first()
    await expect(link).toHaveAttribute('href', '#popular')
  })

  test('For hosts anchor link points to #hosts', async ({ page }) => {
    const link = page.getByRole('link', { name: /for hosts/i }).first()
    await expect(link).toHaveAttribute('href', '#hosts')
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

  test('Hero "Start hosting free" → /signup', async ({ page }) => {
    await page
      .getByRole('link', { name: /start hosting free/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('Hero "Try a sample quiz" → /discover (auth-guarded)', async ({ page }) => {
    await page
      .getByRole('link', { name: /try a sample quiz/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/(discover|login)/)
  })

  test('Popular section "Browse all categories" → /discover', async ({ page }) => {
    await page
      .getByRole('link', { name: /browse all categories/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/(discover|login)/)
  })

  test('Bottom CTA "Create your first quiz" → /signup', async ({ page }) => {
    await page
      .getByRole('link', { name: /create your first quiz/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('"About Sparq" footer link opens the in-app About page', async ({ page }) => {
    const a = page.getByRole('link', { name: /about sparq/i }).first()
    await expect(a).toHaveAttribute('href', '/about')
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

  test('Sample quiz card 1 "Play" link points to /login (anonymous)', async ({ page }) => {
    const links = page.getByRole('link', { name: /^play$/i })
    const first = links.first()
    await expect(first).toHaveAttribute('href', '/login')
  })

  test('Sample quiz card 2 "Play" link also targets /login', async ({ page }) => {
    const links = page.getByRole('link', { name: /^play$/i })
    await expect(links.nth(1)).toHaveAttribute('href', '/login')
  })

  test('Sample quiz card 3 "Play" link also targets /login', async ({ page }) => {
    const links = page.getByRole('link', { name: /^play$/i })
    await expect(links.nth(2)).toHaveAttribute('href', '/login')
  })

  test('Hero H1 contains "spark the room"', async ({ page }) => {
    await expect(page.locator('h1').first()).toContainText(/spark the room/i)
  })

  test('Landing does not call /api/* (gate-12 captureNetwork sentinel)', async ({ page }) => {
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
