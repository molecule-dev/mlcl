import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork } from './_helpers'

// Public landing page — Bushel grocery delivery hero, category strip,
// featured products, "How it works", CTA banners. No auth required.

test.describe('/ (Landing)', () => {
  test('renders hero heading without auth and without 5xx', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/')
    })
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    expect(
      reqs.find((r) => r.status >= 500),
      'no 5xx during landing',
    ).toBeUndefined()
  })

  test('"Get started" navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /get started/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('"Sign in" navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /^sign in$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('"Browse the aisles" / "Browse" link points to /shop', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    // /shop is auth-protected so clicking redirects to /login. Assert
    // on the anchor's href to verify the CTA points at the right route.
    const browse = page.getByRole('link', { name: /browse/i }).first()
    await expect(browse).toBeVisible()
    const href = await browse.getAttribute('href')
    expect(href).toMatch(/\/shop$/)
  })

  test('a category card links to /shop with category query param', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const produce = page.getByRole('link', { name: /produce/i }).first()
    await expect(produce).toBeVisible()
    // /shop is auth-protected so clicking redirects to /login. Assert on the
    // anchor's href to verify the category-card links to the right route.
    const href = await produce.getAttribute('href')
    expect(href).toMatch(/\/shop\?category=/)
  })

  test('a featured product links to /product/:id', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    // /product/:id is auth-protected so clicking redirects to /login.
    // Assert on the anchor's href instead.
    const productLink = page.locator('a[href^="/product/"]').first()
    await expect(productLink).toBeVisible()
    const href = await productLink.getAttribute('href')
    expect(href).toMatch(/\/product\//)
  })
})
