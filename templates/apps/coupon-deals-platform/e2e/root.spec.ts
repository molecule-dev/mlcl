import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('Landing page (/)', () => {
  test('renders the hero headline anonymously', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(
      page.getByRole('heading', { name: /grab it before it.s gone/i, level: 1 }),
    ).toBeVisible()
  })

  test('header Snagr brand link returns to /', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: 'Snagr' }).first().click()
    await expect(page).toHaveURL(/^http:\/\/[^/]+\/?$/)
  })

  test('header "Sign in" link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /sign in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('header "Sign up free" link navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: /sign up free/i }).click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('hero "Start saving free" CTA navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: /start saving free/i }).click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('hero "Browse deals" link navigates to /deals (auth-guarded redirects to /login)', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: /browse deals/i }).click()
    await expect(page).toHaveURL(/\/(deals|login)/)
  })

  test('"View all" link in trending section nav to /deals (or /login if not authed)', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: 'View all' }).first().click()
    await expect(page).toHaveURL(/\/(deals|login)/)
  })

  test('renders the "Snag these before they vanish" trending section heading', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(
      page.getByRole('heading', { name: /snag these before they vanish/i, level: 2 }),
    ).toBeVisible()
  })

  test('trending section renders deal-card articles from /api/deals/public', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/')
      await page.waitForTimeout(1000)
    })
    const cards = await page.locator('article').count()
    expect(cards, 'trending deal cards rendered').toBeGreaterThanOrEqual(1)
    const dealsApi = reqs.filter((r) => /\/api\/deals\/public/.test(r.url))
    expect(dealsApi.length, '/api/deals/public was fetched').toBeGreaterThan(0)
    expect(
      dealsApi.every((r) => r.status === 200),
      'all deals/public calls returned 200',
    ).toBe(true)
  })

  test('footer "Create my free account" CTA navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: /create my free account/i }).click()
    await expect(page).toHaveURL(/\/signup$/)
  })
})
