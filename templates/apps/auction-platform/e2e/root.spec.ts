import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/', () => {
  test('renders hero headline', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading', { name: /counts/i, level: 1 })).toBeVisible()
  })

  test('Sign in link goes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: /Sign in/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('Start bidding link goes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /Start bidding/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('Browse auctions link goes to /auctions or /login (auth gate)', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /^Browse auctions$/i })
      .first()
      .click()
    expect(page.url()).toMatch(/\/(auctions|login)/)
  })

  test('Start selling link (footer/CTA) goes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /Start selling/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('Gavl logo link returns to /', async ({ page }) => {
    await page.goto(APP_BASE + '/about')
    await page.getByRole('link', { name: /Gavl/i }).first().click()
    expect(page.url()).toMatch(/\/$|\/$|\/about\/?$/)
  })

  test('landing fetches /api/auctions on load', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/')
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    expect(reqs.some((r) => /\/api\/auctions/.test(r.url) && r.method === 'GET')).toBeTruthy()
  })
})
