/**
 * / — Public marketing landing. Header nav, hero CTAs, demo card,
 * features grid, footer. No backend calls.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('landing page', () => {
  test('renders hero with primary CTAs (HTML doc loads with 200)', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/')
      await expect(page.getByRole('heading', { level: 1 })).toContainText(/Design tools/i)
    })
    const root = reqs.find((r) => /\/$/.test(new URL(r.url).pathname) && r.status === 200)
    expect(root).toBeTruthy()
    await expect(page.getByRole('link', { name: /Start designing for free/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Browse templates/ })).toBeVisible()
  })

  test('brand link points back to "/"', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const brand = page.getByRole('link', { name: /^brush Atelier$/ }).first()
    await expect(brand).toHaveAttribute('href', '/')
  })

  test('header "Templates" link navigates to /templates', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /Templates/ })
      .first()
      .click()
    await page.waitForURL(/\/(templates|login)/, { timeout: 5000 })
  })

  test('header "Library" link navigates to /library (auth gate redirects to /login)', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /Library/ })
      .first()
      .click()
    await page.waitForURL(/\/(library|login)/, { timeout: 5000 })
  })

  test('"Toggle theme" button flips document data-mol-mode/theme attribute', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const before = await page.evaluate(
      () =>
        document.documentElement.getAttribute('data-mol-mode') ??
        document.documentElement.getAttribute('data-mol-theme') ??
        '',
    )
    await page.getByRole('button', { name: /Toggle theme/ }).click()
    await page.waitForTimeout(500)
    const after = await page.evaluate(
      () =>
        document.documentElement.getAttribute('data-mol-mode') ??
        document.documentElement.getAttribute('data-mol-theme') ??
        '',
    )
    expect(after).not.toBe(before)
  })

  test('"Sign in" link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /Sign in/ })
      .first()
      .click()
    await page.waitForURL('**/login', { timeout: 5000 })
  })

  test('"Get started" header link navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /Get started/ })
      .first()
      .click()
    await page.waitForURL('**/signup', { timeout: 5000 })
  })

  test('hero "Start designing for free" navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: /Start designing for free/ }).click()
    await page.waitForURL('**/signup', { timeout: 5000 })
  })

  test('hero "Browse templates" navigates to /templates', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: /Browse templates/ }).click()
    await page.waitForURL(/\/(templates|login)/, { timeout: 5000 })
  })

  test('demo card "Northwind" navigates to /editor/demo-1', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: /Northwind · Brand Refresh/ }).click()
    await page.waitForURL(/\/(editor|login)/, { timeout: 5000 })
  })

  test('features section "Create your free workspace" navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: /Create your free workspace/ }).click()
    await page.waitForURL('**/signup', { timeout: 5000 })
  })
})
