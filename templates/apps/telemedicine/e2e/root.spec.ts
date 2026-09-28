import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/ — Landing', () => {
  test('renders Solace nav, hero CTA, and feature cards', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page).toHaveTitle(/Solace/i)
    // Top nav: brand + sign-in + the auth CTA (design copy: "Get Care Now",
    // routed to /signup — the design wave renamed the literal "Sign up" link)
    await expect(page.getByRole('link', { name: /^Solace$/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /sign in/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /get care now/i }).first()).toBeVisible()
    // Hero
    await expect(
      page.getByRole('heading', { level: 1, name: /care without the commute/i }),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: /start a visit/i }).first()).toBeVisible()
    // Trust stats — four cards
    await expect(page.getByText(/4\.2M/)).toBeVisible()
    await expect(page.getByText(/Visits this year/i)).toBeVisible()
    await expect(page.getByText(/Avg wait time/i)).toBeVisible()
    await expect(page.getByText(/50 states/)).toBeVisible()
    // Feature grid headings
    await expect(page.getByRole('heading', { name: /virtual visits in minutes/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /records in one place/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /send prescriptions same-day/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /continuity of care/i })).toBeVisible()
  })

  test('Nav auth CTA routes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /get care now/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('Sign in nav link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /^sign in$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('Hero CTA routes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /start a visit/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/)
  })
})
