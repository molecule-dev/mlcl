import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/ (Landing)', () => {
  test('brand link returns to /', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /Auberge/i })
      .first()
      .click()
    await expect(page).toHaveURL(new RegExp(APP_BASE.replace(/[/.]/g, '\\$&') + '/?$'))
  })

  test('top-nav "Search stays" navigates to /search', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: /Search stays/i }).click()
    await expect(page).toHaveURL(/\/search/)
  })

  test('top-nav "Sign in" navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /Sign in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('top-nav "Join Auberge" navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: /Join Auberge/i }).click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('hero "Guests" combobox accepts a different value', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const combo = page.getByRole('combobox', { name: /Guests/i })
    await combo.selectOption('4')
    await expect(combo).toHaveValue('4')
  })

  test('hero "Search" button navigates to /search', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('button', { name: /^Search$/ }).click()
    await expect(page).toHaveURL(/\/search/)
  })

  test('"See all destinations" link navigates to /search', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: /See all destinations/i }).click()
    await expect(page).toHaveURL(/\/search/)
  })

  test('"Browse the full collection" link navigates to /search', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: /Browse the full collection/i }).click()
    await expect(page).toHaveURL(/\/search/)
  })

  test('members-band "Create free account" link navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: /Create free account/i }).click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('members-band "Browse stays" link navigates to /search', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: /Browse stays/i }).click()
    await expect(page).toHaveURL(/\/search/)
  })

  test('document fully loads (network) so HTML is observed', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/', { waitUntil: 'domcontentloaded' })
    })
    expect(reqs.length, 'page must issue at least one network request').toBeGreaterThan(0)
  })
})
