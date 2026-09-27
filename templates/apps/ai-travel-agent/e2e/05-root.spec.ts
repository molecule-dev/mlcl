import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

/**
 * Public landing (Wayfarer / `/`) — the marketing surface that
 * unauthenticated users hit before signing up. Asserts every link's
 * destination, the static pricing block (Free / Pro / Team), and the
 * footer-level Privacy / Terms links live and route correctly.
 */
test.describe('/ (root landing)', () => {
  test('hero "Try the demo" CTA links to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const link = page.getByRole('link', { name: /try.*the.*demo/i }).first()
    await expect(link).toHaveAttribute('href', /\/signup/)
  })

  test('hero secondary "Sign in" CTA links to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const link = page.getByRole('link', { name: /sign in/i }).first()
    await expect(link).toHaveAttribute('href', /\/login/)
  })

  test('top-bar "Get started" CTA links to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const link = page.getByRole('link', { name: /get started/i }).first()
    await expect(link).toHaveAttribute('href', /\/signup/)
  })

  test('clicking "Try the demo" navigates the user to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /try.*the.*demo/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup/, { timeout: 10_000 })
  })

  test('the public pricing block lists all three plan cards', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading', { name: /^free$/i }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: /^pro$/i }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: /^team$/i }).first()).toBeVisible()
  })

  test('Pro plan CTA "Upgrade to Pro" routes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const link = page.getByRole('link', { name: /upgrade.*to.*pro/i }).first()
    await expect(link).toHaveAttribute('href', /\/signup/)
  })

  test('Team plan CTA "Contact Sales" routes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const link = page.getByRole('link', { name: /contact.*sales/i }).first()
    await expect(link).toHaveAttribute('href', /\/signup/)
  })

  test('footer Privacy link routes to /privacy', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /^privacy$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/privacy$/, { timeout: 10_000 })
  })

  test('footer Terms link routes to /terms', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /^terms$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/terms$/, { timeout: 10_000 })
  })

  test('renders the hero heading and brand link', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('link', { name: /wayfarer/i }).first()).toBeVisible()
  })
})
